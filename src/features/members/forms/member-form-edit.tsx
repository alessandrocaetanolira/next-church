'use client';
import { MemberForm } from './member-form';
export function MemberFormEdit(props: React.ComponentProps<typeof MemberForm> & { member: NonNullable<React.ComponentProps<typeof MemberForm>['member']> }) { return <MemberForm {...props} />; }
