import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useDatabase } from '@/src/database/context';

export default function Index() {
  const database = useDatabase();
  const [hasProfiles, setHasProfiles] = useState<boolean | null>(null);

  useEffect(() => {
    const checkProfiles = async () => {
      try {
        const perfiles = await database.get('perfiles').query().fetch();
        setHasProfiles(perfiles.length > 0);
      } catch (error) {
        console.error("Error comprobando perfiles:", error);
        setHasProfiles(false);
      }
    };
    checkProfiles();
  }, [database]);

  if (hasProfiles === null) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (hasProfiles) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/onboarding" />;
}
