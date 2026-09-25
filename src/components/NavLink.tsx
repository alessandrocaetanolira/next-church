"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  end?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, to, children, end, onClick, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = end ? pathname === to : pathname.startsWith(to);

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
