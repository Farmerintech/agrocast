import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { colors } from './theme';

export function BrandMark({ size = 36 }: { size?: number }) { return <View style={{ width: size, height: size, borderRadius: size * 0.33, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="leaf" size={size * 0.5} color="#FFF" /></View>; }
