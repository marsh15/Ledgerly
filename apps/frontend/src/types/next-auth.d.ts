import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    backendToken?: string | undefined;
    backendJwt?: string | undefined;
    user?: {
      id?: string | undefined;
      name?: string | null | undefined;
      email?: string | null | undefined;
      image?: string | null | undefined;
    };
  }

  interface User {
    backendToken?: string | undefined;
    backendJwt?: string | undefined;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string | undefined;
    backendJwt?: string | undefined;
  }
}
