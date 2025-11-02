import { Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  create(createUserDto: CreateUserDto) {
    this.logger.log('[POST] /users Request received for username: ${createUserDto.username}');
    this.logger.log('[POST] /users Request received for email: ${createUserDto.email}');
    this.logger.debug('Received Full Payload: ', createUserDto);

    return{
      message: 'User registered successfully.',
      status: 'success_mock',
      receivedEmail: createUserDto.email,
    };
  }

  findAll() { 
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
