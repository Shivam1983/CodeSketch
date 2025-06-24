import express from "express";

import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prismaClient = new PrismaClient();


import { Request, Response } from 'express';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { middleware } from "./middleware";
import cors from 'cors';

import { z } from "zod";

export const CreateUserSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string(),
    name: z.string()
})

export const SigninSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string(),
})

export const CreateRoomSchema = z.object({
    name: z.string().min(3).max(20),
})


const app = express();

app.use(cors({
    origin: '*',  // Allow all origins (adjust this for more restrictive settings)
}));


declare global {
    namespace Express {
      interface Request {
        userId?: string | null;
      }
    }
}

app.use(express.json());

app.use(cors());

import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });

const JWT_SECRET = process.env.JWT_SECRET || "123123";


app.post('/signup', async (req, res) => {
    const parsedData = CreateUserSchema.safeParse(req.body);

    if (!parsedData.success) {
        console.log(parsedData.error);
        res.status(400).json({
            msg: "Incorrect Inputs"
        });
        return;
    }

    const hashPassword = await bcrypt.hash(parsedData.data.password, 10);
    try {
        const user = await prismaClient.user.create({
            data: { 
                name: parsedData.data.name,
                email: parsedData.data.username,
                password: hashPassword
            }
        });
        res.status(201).send("Sign up Success"); // Send success status
    } catch (e) {
        res.status(411).json({
            msg: "User already exists with this email"
        });
        console.log(e);
    }
});


app.post('/signin', async (req, res) => {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        console.log('Invalid input:', parsedData.error);
        res.status(410).json({ msg: "Incorrect Inputs" });
        return;
    }

    try {
        const user = await prismaClient.user.findFirst({
            where: { email: parsedData.data.username },
        });

        if (!user || !user.password) {
            console.log('User not found');
            res.status(411).json({ msg: "Invalid email or password" });
            return;
        }

        const matchPassword = await bcrypt.compare(parsedData.data.password, user?.password);
        if (!matchPassword) {
            console.log('Password mismatch');
            res.status(410).json({ msg: "Incorrect Password" });
            return;
        }

        const userid = user.id;
        const token = jwt.sign({ userid }, JWT_SECRET);

        console.log('JWT generated:', token);
        res.status(200).json({ token });
    } catch (e) {
        console.log('Error during signin:', e);
        res.status(411).json({ msg: "User not found" });
    }
});


app.post('/room', middleware, async (req: Request,res: Response): Promise<void> => {
    const parsedData = CreateRoomSchema.safeParse(req.body);

    if (!parsedData.success) {
        res.json({
            msg: "Incorrect Inputs"
        });
        return;
    }
    const userId = req.userId;

    if (!userId) {
        res.status(404).json({msg: "User not Signed in"});
        return;
    }

    try{
        const room = await prismaClient.room.create({
            data: {
                slug: parsedData.data.name,
                adminId: userId
            }
        })
        res.status(200).json({
            roomId: room.id
        })
    } catch(e) {
        res.status(409).json({msg: "Room already exists"})
    }
})

app.get('/chats/:roomId', async (req,res) => {
    const roomId = Number(req.params.roomId);
    
    try {
        const messages = await prismaClient.chat.findMany({
            where: {
                roomId: roomId
            },
            orderBy: {
                id: "desc"
            },
            take: 50
        });

        res.json({
            messages
        })
    } catch (e) {
        res.status(411).json({msg: "Room doesn't exist"})
    }
})

app.get('/room/:slug', async (req,res) => {
    const slug = req.params.slug;
    const room = await prismaClient.room.findFirst({
        where: {
            slug
        }
    })

    res.json({
        room
    })
})

app.post('/clear', async (req, res) => {
    const roomId = req.body.roomId;

    const room = await prismaClient.chat.deleteMany({
        where: {
            roomId
        }
    })

    res.status(200).json({msg: "Cleared Canvas"})
})



app.listen(3002, () => {
    console.log("Server is running on port 3002");
});
