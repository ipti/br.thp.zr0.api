import { HttpException } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common/enums/http-status.enum";
import { Prisma } from "@prisma/client";

export default function includeQuery(include, datamodel){

    if(JSON.stringify(include) === '{}' || include === undefined){
        return null;
    }

    const validIncluders: any = [];

const model = Prisma.dmmf.datamodel.models.find(m => m.name === datamodel);

if (!model) {
  throw new Error(`Modelo '${datamodel}' não encontrado no DMMF.`);
}

const fieldsModel = model.fields;
    validIncluders.push(...(fieldsModel.filter(field => field.kind === 'object').map(field => field.name)));
    
    const includers = JSON.parse(include);

    Object.keys(includers).forEach(key => {
      if (validIncluders.includes(key)) {
      }else{
        throw new HttpException(
          'Invalid include',
          HttpStatus.BAD_REQUEST,
        );
      }
    });

    return includers;
}