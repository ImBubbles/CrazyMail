import { Injectable, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  // In-memory storage for demo purposes
  // In production, you would use a database
  private users: Array<{ username: string; password: string }> = [];

  async create(createUserDto: CreateUserDto) {
    const { username, password } = createUserDto;

    // Check if user already exists
    const existingUser = this.users.find((u) => u.username === username);
    if (existingUser) {
      throw new ConflictException('User with this username already exists');
    }

    // Create new user
    const newUser = {
      username,
      password, // In production, hash the password before storing
    };

    this.users.push(newUser);

    return newUser;
  }

  async findOne(username: string) {
    return this.users.find((u) => u.username === username);
  }
}

