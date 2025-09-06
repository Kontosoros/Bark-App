import { AIPrediction, Note, User, UserModel } from '../models/note.model';

export function dtoUserRegistry(user: any): UserModel {
  return {
    username: user.name,
    email: user.email,
    password: user.password,
    confirm_password: user.confirmPassword,
  };
}

export function mapUser(user: any): User {
  return {
    userName: user.username,
  };
}


export function mapUserRegistry(user: any): UserModel {
  return {
    username: user.name,
    email: user.email,
    password: user.password,
    confirm_password: user.confirmPassword,
  };
}
export function mapAIPrediction(prediction: any): AIPrediction {
  return {
    timestamp: prediction.timestamp,
    prediction: prediction.prediction,
    confidence: prediction.confidence,
  };
}
