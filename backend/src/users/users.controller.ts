import { Controller, Post, Body, HttpCode, HttpStatus, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      return {
        success: true,
        message: 'User created successfully',
        user: {
          username: user.username,
        },
      };
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new ConflictException('Username already exists');
      }
      throw error;
    }
  }
}

