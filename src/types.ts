export interface Movie {
  id: string;
  title: string;
  description: string;
  genre: string;
  year: number;
  actors: string[];
  reviews: string;
  titleVector?: number[];
  descriptionVector?: number[];
  genreVector?: number[];
  yearVector?: number[];
  actorsVector?: number[];
  reviewsVector?: number[];
}
