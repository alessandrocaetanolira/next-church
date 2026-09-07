import { redirect } from 'next/navigation';

export default function EquipesRedirectPage() {
  redirect('/groups?type=team');
}
