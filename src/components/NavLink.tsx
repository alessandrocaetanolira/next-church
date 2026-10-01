"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties, forwardRef, MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  end?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  style?: CSSProperties;
  title?: string;
  'aria-disabled'?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, to, children, end, onClick, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = end || to === "/"
      ? pathname === to
      : pathname === to || pathname.startsWith(`${to}/`);

    return (
      <Link
        href={to}
        ref={ref}
        onClick={onClick}
        className={cn(className, isActive && activeClassName)}
        {...props}
      >
        {children}
      </Link>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
