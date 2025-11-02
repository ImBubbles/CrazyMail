import { Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  create(createUserDto: CreateUserDto) {
    this.logger.log(`[POST] /users Request received for username: ${createUserDto.username}`);
    this.logger.debug('Received Full Payload: ', createUserDto);

    // TODO: Add database save logic here
    // For now, just return success response
    
    return {
      message: 'User registered successfully.',
      status: 'success_mock',
      username: createUserDto.username,
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
