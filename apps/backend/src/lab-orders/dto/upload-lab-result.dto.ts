import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UploadLabResultItemDto } from './upload-lab-result-item.dto';

export class UploadLabResultDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UploadLabResultItemDto)
  items!: UploadLabResultItemDto[];
}