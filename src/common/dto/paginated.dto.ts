import { ApiProperty } from "@nestjs/swagger";

/** Métadonnées de pagination accompagnant une liste paginée. */
export class PaginationMetaDto {
  @ApiProperty({ example: 42, description: "Nombre total d'éléments" })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3, description: "Nombre total de pages" })
  pageCount: number;
}

/** Enveloppe générique d'une réponse paginée. */
export class PaginatedDto<T> {
  items: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

/** Construit une réponse paginée à partir des éléments de la page et du total. */
export function paginate<T>(
  items: T[],
  total: number,
  query: { page: number; limit: number },
): PaginatedDto<T> {
  return {
    items,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      pageCount: Math.ceil(total / query.limit),
    },
  };
}
