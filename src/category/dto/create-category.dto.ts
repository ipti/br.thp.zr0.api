import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateCategoryDto {

      @IsNotEmpty()
      @IsString()
      @MaxLength(150)
      @ApiProperty()
      name: string;
}
