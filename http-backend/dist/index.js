"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRoomSchema = exports.SigninSchema = exports.CreateUserSchema = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = __importDefault(require("@prisma/client"));
const { PrismaClient } = client_1.default;
const prismaClient = new PrismaClient();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const middleware_1 = require("./middleware");
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
exports.CreateUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(20),
    password: zod_1.z.string(),
    name: zod_1.z.string()
});
exports.SigninSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(20),
    password: zod_1.z.string(),
});
exports.CreateRoomSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(20),
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins (adjust this for more restrictive settings)
}));
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: './config.env' });
const JWT_SECRET = process.env.JWT_SECRET || "123123";
app.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = exports.CreateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        console.log(parsedData.error);
        res.status(400).json({
            msg: "Incorrect Inputs"
        });
        return;
    }
    const hashPassword = yield bcrypt_1.default.hash(parsedData.data.password, 10);
    try {
        const user = yield prismaClient.user.create({
            data: {
                name: parsedData.data.name,
                email: parsedData.data.username,
                password: hashPassword
            }
        });
        res.status(201).send("Sign up Success"); // Send success status
    }
    catch (e) {
        res.status(411).json({
            msg: "User already exists with this email"
        });
        console.log(e);
    }
}));
app.post('/signin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Signin request received:', req.body);
    const parsedData = exports.SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        console.log('Invalid input:', parsedData.error);
        res.status(410).json({ msg: "Incorrect Inputs" });
        return;
    }
    try {
        const user = yield prismaClient.user.findFirst({
            where: { email: parsedData.data.username },
        });
        if (!user || !user.password) {
            console.log('User not found');
            res.status(411).json({ msg: "Invalid email or password" });
            return;
        }
        const matchPassword = yield bcrypt_1.default.compare(parsedData.data.password, user === null || user === void 0 ? void 0 : user.password);
        if (!matchPassword) {
            console.log('Password mismatch');
            res.status(410).json({ msg: "Incorrect Password" });
            return;
        }
        const userid = user.id;
        const token = jsonwebtoken_1.default.sign({ userid }, JWT_SECRET);
        console.log('JWT generated:', token);
        res.status(200).json({ token });
    }
    catch (e) {
        console.log('Error during signin:', e);
        res.status(411).json({ msg: "User not found" });
    }
}));
app.post('/room', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = exports.CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.json({
            msg: "Incorrect Inputs"
        });
        return;
    }
    const userId = req.userId;
    if (!userId) {
        res.status(404).json({ msg: "User not Signed in" });
        return;
    }
    try {
        const room = yield prismaClient.room.create({
            data: {
                slug: parsedData.data.name,
                adminId: userId
            }
        });
        res.status(200).json({
            roomId: room.id
        });
    }
    catch (e) {
        res.status(409).json({ msg: "Room already exists" });
    }
}));
app.get('/chats/:roomId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const roomId = Number(req.params.roomId);
    try {
        const messages = yield prismaClient.chat.findMany({
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
        });
    }
    catch (e) {
        res.status(411).json({ msg: "Room doesn't exist" });
    }
}));
app.get('/room/:slug', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const slug = req.params.slug;
    const room = yield prismaClient.room.findFirst({
        where: {
            slug
        }
    });
    res.json({
        room
    });
}));
app.post('/clear', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const roomId = req.body.roomId;
    const room = yield prismaClient.chat.deleteMany({
        where: {
            roomId
        }
    });
    res.status(200).json({ msg: "Cleared Canvas" });
}));
app.listen(3002);
