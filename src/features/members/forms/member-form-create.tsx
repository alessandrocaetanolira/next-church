'use client';
import { MemberForm } from './member-form';
export function MemberFormCreate(props: Omit<React.ComponentProps<typeof MemberForm>, 'member'>) { return <MemberForm {...props} />; }
