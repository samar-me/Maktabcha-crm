import * as React from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
