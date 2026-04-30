import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: Add auth check — redirect to login if not authenticated
  return <Redirect href="/(auth)/login" />;
}
