import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });

const JWT_SECRET = process.env.JWT_SECRET || "123123";

export function middleware(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers["authorization"];

    if (!token) {
        res.status(401).json({ message: "Unauthorized: No token provided" });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        if (!decoded || typeof decoded !== "object" || !decoded.userid) {
            res.status(401).json({ message: "Unauthorized: Invalid token" });
            return;
        }

        req.userId = decoded.userid;
        next();
    } catch (error) {
        res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
}