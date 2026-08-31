export interface SessionSuccessDto {
  success: true;
  data: {
    authenticated: true;
    sub: string;
  };
}
