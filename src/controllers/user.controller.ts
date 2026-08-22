import {  SystemCustomErrorMsgByCode } from "@/events"
import { ApiError, ApiResponse } from "@/libs"
import type {Request, Response} from "express"


interface UserControllerType {
    createUser(req: Request, res: Response): Promise<Response>
    createAddress(req: Request, res: Response): Promise<Response>
    createPhone(req: Request, res: Response): Promise<Response>
    createEmail(req: Request, res: Response): Promise<Response>
    
    verifyUser(req: Request, res: Response): Promise<Response>
    verifyContactPhone(req: Request, res: Response): Promise<Response>
    verifyContactEmail(req: Request, res: Response): Promise<Response>
    
    updateProfile(req: Request, res: Response): Promise<Response>
    updateAddress(req: Request, res: Response): Promise<Response>
    updateContact(req: Request, res: Response): Promise<Response>
    
    deleteProfile(req: Request, res: Response): Promise<Response>
    deleteAddress(req: Request, res: Response): Promise<Response>
    deleteContact(req: Request, res: Response): Promise<Response>
}

export class UserController implements UserControllerType {
    async createUser(req: Request, res: Response): Promise<Response> {

    }
}