import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UploadLabResultItemDto } from './upload-lab-result-item.dto';

export class UploadLabResultDto {
  @ApiProperty({
    description: 'List of lab result values to upload',
    type: [UploadLabResultItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UploadLabResultItemDto)
  items!: UploadLabResultItemDto[];
}