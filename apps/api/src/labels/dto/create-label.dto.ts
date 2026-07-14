import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, Length } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty({ example: 'backend' })
  @IsString()
  @Length(1, 30)
  name!: string;

  @ApiPropertyOptional({ example: '#34d399' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
