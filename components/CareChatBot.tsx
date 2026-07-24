import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  Easing,
  interpolate,
  cancelAnimation,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TC } from './theme';

/* ── Types ── */
type BotState = 'idle' | 'thinking' | 'responding';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

/* ── Predefined bot responses (demo) ── */
const BOT_RESPONSES: Record<string, string> = {
  hola: '¡Hola! 👋 Soy CareBot, tu asistente de TinyCare. ¿En qué puedo ayudarte hoy?',
  temperatura:
    'La temperatura normal de un bebé es entre 36.5°C y 37.5°C. Si supera los 38°C, consulta al pediatra. 🌡️',
  fiebre:
    'Si tu bebé tiene fiebre (>38°C), mantén hidratación, usa ropa ligera y consulta a tu médico. No uses aspirina en bebés. 🏥',
  sueño:
    'Un recién nacido duerme entre 14-17 horas al día. Colócalo boca arriba en una superficie firme. 💤',
  dormir:
    'Los bebés de 0-3 meses necesitan 14-17h de sueño. De 4-11 meses, 12-15h. Establece una rutina constante. 🌙',
  alimentación:
    'La lactancia exclusiva se recomienda hasta los 6 meses. Después, complementa con alimentos sólidos. 🍼',
  leche:
    'Un recién nacido toma entre 60-90ml por toma, cada 2-3 horas. Aumenta gradualmente. 🍼',
  pañal:
    'Cambia el pañal cada 2-3 horas o cuando esté sucio. Limpia siempre de adelante hacia atrás. 👶',
  vacunas:
    'Las vacunas son esenciales. Sigue el esquema del IMSS/pediatra. Las primeras son al nacer (BCG y Hepatitis B). 💉',
  peso:
    'Los bebés duplican su peso al nacer alrededor de los 5 meses y lo triplican al año. 📊',
  oxígeno:
    'La saturación normal de oxígeno (SpO2) en bebés es 95-100%. Si baja de 94%, busca atención médica. 💙',
  llanto:
    'El llanto es comunicación. Puede indicar hambre, sueño, pañal sucio, gas o necesidad de contacto. Descarta uno a uno. 😢',
  cólico:
    'Los cólicos son comunes de 2 semanas a 4 meses. Prueba movimientos suaves, ruido blanco y contacto piel con piel. 🤱',
  baño:
    'Baña a tu bebé 2-3 veces por semana con agua tibia (37°C). No lo dejes solo ni un segundo en el agua. 🛁',
  ayuda:
    'Puedo ayudarte con: temperatura, sueño, alimentación, vacunas, peso, oxígeno, llanto, cólicos, baño y más. ¡Pregúntame! 📋',
};

const DEFAULT_RESPONSE =
  'Interesante pregunta. 🤔 Por ahora soy un chatbot de demostración. Intenta preguntar sobre: temperatura, sueño, alimentación, vacunas, peso, oxígeno, llanto, cólicos o baño.';

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  text: '¡Hola! 👶 Soy CareBot, tu asistente de cuidado infantil. Pregúntame sobre temperatura, sueño, alimentación y más.',
  sender: 'bot',
  timestamp: new Date(),
};

const QUICK_REPLIES = ['Temperatura', 'Sueño', 'Alimentación', 'Ayuda'];

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/* ══════════════════════════════════════════════════
   Thinking Dots Animation
   ══════════════════════════════════════════════════ */
function ThinkingDots() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    dot2.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    dot3.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(dot1);
      cancelAnimation(dot2);
      cancelAnimation(dot3);
    };
  }, []);

  const aStyle1 = useAnimatedStyle(() => ({
    opacity: interpolate(dot1.value, [0, 1], [0.3, 1]),
    transform: [{ translateY: interpolate(dot1.value, [0, 1], [0, -6]) }],
  }));
  const aStyle2 = useAnimatedStyle(() => ({
    opacity: interpolate(dot2.value, [0, 1], [0.3, 1]),
    transform: [{ translateY: interpolate(dot2.value, [0, 1], [0, -6]) }],
  }));
  const aStyle3 = useAnimatedStyle(() => ({
    opacity: interpolate(dot3.value, [0, 1], [0.3, 1]),
    transform: [{ translateY: interpolate(dot3.value, [0, 1], [0, -6]) }],
  }));

  return (
    <View style={s.thinkingRow}>
      <Animated.View style={[s.thinkingDot, aStyle1]} />
      <Animated.View style={[s.thinkingDot, aStyle2]} />
      <Animated.View style={[s.thinkingDot, aStyle3]} />
    </View>
  );
}

/* ══════════════════════════════════════════════════
   FAB Pulse Ring
   ══════════════════════════════════════════════════ */
function PulseRing({ state }: { state: BotState }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (state === 'idle') {
      // Gentle breathing
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else if (state === 'thinking') {
      // Faster pulse
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulse.value = withTiming(0, { duration: 300 });
    }

    return () => cancelAnimation(pulse);
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0, 0.35]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.6]) }],
  }));

  return <Animated.View style={[s.pulseRing, animStyle]} />;
}

/* ══════════════════════════════════════════════════
   Main CareChatBot Component
   ══════════════════════════════════════════════════ */
export default function CareChatBot() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [botState, setBotState] = useState<BotState>('idle');
  const flatListRef = useRef<FlatList>(null);

  // FAB icon rotation
  const fabRotation = useSharedValue(0);

  const toggleChat = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      fabRotation.value = withSpring(next ? 1 : 0, { damping: 12 });
      return next;
    });
  }, []);

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(fabRotation.value, [0, 1], [0, 135])}deg`,
      },
    ],
  }));

  /* ── Find a matching response ── */
  const findResponse = (text: string): string => {
    const lower = text.toLowerCase().trim();
    for (const [key, value] of Object.entries(BOT_RESPONSES)) {
      if (lower.includes(key)) return value;
    }
    return DEFAULT_RESPONSE;
  };

  /* ── Send message ── */
  const sendMessage = useCallback(
    (text?: string) => {
      const msgText = (text || input).trim();
      if (!msgText) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        text: msgText,
        sender: 'user',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setBotState('thinking');

      // Simulate thinking delay
      const thinkTime = 1200 + Math.random() * 1500;

      setTimeout(() => {
        setBotState('responding');
        const response = findResponse(msgText);

        // Simulate typing delay
        setTimeout(() => {
          const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: response,
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMsg]);
          setBotState('idle');
        }, 600);
      }, thinkTime);
    },
    [input]
  );

  /* ── Render each message bubble ── */
  const renderMessage = ({ item }: { item: Message }) => {
    const isBot = item.sender === 'bot';
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[s.bubble, isBot ? s.bubbleBot : s.bubbleUser]}
      >
        {isBot && (
          <View style={s.botAvatar}>
            <Text style={s.botAvatarText}>🤖</Text>
          </View>
        )}
        <View style={[s.bubbleContent, isBot ? s.bubbleContentBot : s.bubbleContentUser]}>
          <Text style={[s.bubbleText, isBot ? s.bubbleTextBot : s.bubbleTextUser]}>
            {item.text}
          </Text>
          <Text style={[s.timeText, isBot ? s.timeTextBot : s.timeTextUser]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Animated.View>
    );
  };

  /* ── State indicator label ── */
  const stateLabel =
    botState === 'thinking'
      ? 'Pensando…'
      : botState === 'responding'
      ? 'Escribiendo…'
      : 'En línea';

  const stateColor =
    botState === 'thinking'
      ? TC.vitalActivity
      : botState === 'responding'
      ? TC.vitalHeart
      : TC.navActive;

  return (
    <>
      {/* ── Floating Action Button ── */}
      <View style={[s.fabContainer, { bottom: 100 + insets.bottom }]}>
        <PulseRing state={botState} />
        <TouchableOpacity
          style={s.fab}
          onPress={toggleChat}
          activeOpacity={0.85}
        >
          <Animated.View style={fabIconStyle}>
            <Ionicons
              name={open ? 'close' : 'chatbubble-ellipses'}
              size={26}
              color="#FFF"
            />
          </Animated.View>
        </TouchableOpacity>

        {/* State indicator dot on FAB */}
        <Animated.View style={[s.fabDot, { backgroundColor: stateColor }]} />
      </View>

      {/* ── Chat Panel (Modal) ── */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={toggleChat}
        statusBarTranslucent
      >
        <View style={s.overlay}>
          <TouchableOpacity style={s.overlayTouch} onPress={toggleChat} />
          <Animated.View
            entering={SlideInDown.springify().damping(18).stiffness(140)}
            exiting={SlideOutDown.duration(250)}
            style={[
              s.chatPanel,
              {
                maxHeight: SCREEN_H * 0.72,
                paddingBottom: insets.bottom + 8,
              },
            ]}
          >
            {/* ── Header ── */}
            <View style={s.chatHeader}>
              <View style={s.chatHeaderLeft}>
                <View style={s.headerAvatar}>
                  <Text style={{ fontSize: 20 }}>👶</Text>
                </View>
                <View>
                  <Text style={s.chatTitle}>CareBot</Text>
                  <View style={s.statusRow}>
                    <View style={[s.statusDot, { backgroundColor: stateColor }]} />
                    <Text style={[s.statusText, { color: stateColor }]}>{stateLabel}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={toggleChat} style={s.closeBtn}>
                <Ionicons name="chevron-down" size={24} color={TC.textMuted} />
              </TouchableOpacity>
            </View>

            {/* ── Messages ── */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderMessage}
              contentContainerStyle={s.messagesList}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                botState === 'thinking' ? (
                  <View style={[s.bubble, s.bubbleBot]}>
                    <View style={s.botAvatar}>
                      <Text style={s.botAvatarText}>🤖</Text>
                    </View>
                    <View style={[s.bubbleContent, s.bubbleContentBot]}>
                      <ThinkingDots />
                    </View>
                  </View>
                ) : null
              }
            />

            {/* ── Quick Replies ── */}
            {messages.length <= 2 && botState === 'idle' && (
              <Animated.View entering={FadeIn.delay(200)} style={s.quickReplies}>
                {QUICK_REPLIES.map((qr) => (
                  <TouchableOpacity
                    key={qr}
                    style={s.quickReplyChip}
                    onPress={() => sendMessage(qr)}
                  >
                    <Text style={s.quickReplyText}>{qr}</Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}

            {/* ── Input Bar ── */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={s.inputBar}>
                <TextInput
                  style={s.textInput}
                  placeholder="Escribe tu pregunta…"
                  placeholderTextColor={TC.textMuted}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={() => sendMessage()}
                  returnKeyType="send"
                  editable={botState === 'idle'}
                />
                <TouchableOpacity
                  style={[
                    s.sendBtn,
                    (!input.trim() || botState !== 'idle') && s.sendBtnDisabled,
                  ]}
                  onPress={() => sendMessage()}
                  disabled={!input.trim() || botState !== 'idle'}
                >
                  <Ionicons name="send" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

/* ══════════════════════════════════════════════════
   Styles
   ══════════════════════════════════════════════════ */
const s = StyleSheet.create({
  /* ── FAB ── */
  fabContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TC.vitalHeart,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TC.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TC.gradientStart,
  },
  fabDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },

  /* ── Overlay ── */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61,44,46,0.3)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },

  /* ── Chat Panel ── */
  chatPanel: {
    backgroundColor: TC.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
  },

  /* ── Header ── */
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder,
    backgroundColor: TC.card,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TC.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TC.textDark,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: TC.inputBg,
  },

  /* ── Messages ── */
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  bubble: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bubbleBot: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    justifyContent: 'flex-end',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TC.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  botAvatarText: {
    fontSize: 14,
  },
  bubbleContent: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 1,
  },
  bubbleContentBot: {
    backgroundColor: TC.card,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderTopLeftRadius: 4,
  },
  bubbleContentUser: {
    backgroundColor: TC.vitalHeart,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextBot: {
    color: TC.textDark,
  },
  bubbleTextUser: {
    color: '#FFF',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
  },
  timeTextBot: {
    color: TC.textMuted,
  },
  timeTextUser: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },

  /* ── Thinking Dots ── */
  thinkingRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    height: 24,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TC.vitalActivity,
  },

  /* ── Quick Replies ── */
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  quickReplyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TC.accentLight,
    borderWidth: 1,
    borderColor: TC.accent,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: '600',
    color: TC.accent,
  },

  /* ── Input Bar ── */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: TC.inputBorder,
    backgroundColor: TC.card,
  },
  textInput: {
    flex: 1,
    backgroundColor: TC.inputBg,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    color: TC.textDark,
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TC.vitalHeart,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TC.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
