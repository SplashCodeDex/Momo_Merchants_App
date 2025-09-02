import { View, Text } from 'react-native';
import React from 'react';
import { Button, styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

export default function MagicSample() {
  return (
    <StyledView className="flex-1 items-center justify-center bg-white dark:bg-black">
      <StyledText className="text-2xl font-bold text-blue-600 dark:text-blue-300 mb-4">
        Magic UI Sample Component
      </StyledText>
      <Button className="px-4 py-2 bg-blue-500 rounded-lg text-white font-semibold">
        Try Me
      </Button>
    </StyledView>
  );
}
