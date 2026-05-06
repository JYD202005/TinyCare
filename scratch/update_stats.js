import fs from 'fs';

const filePath = 'app/(tabs)/stats.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
  'import { Ionicons } from "@expo/vector-icons";',
  'import { Ionicons } from "@expo/vector-icons";\nimport { database } from "../../src/database";\nimport { Perfil, Dispositivo, TelemetriaCruda } from "../../src/database/models";\nimport { useFocusEffect } from "@react-navigation/native";\nimport { useRouter } from "expo-router";'
);

// 2. Rewrite SendToPediatrician
const sendToPedStart = content.indexOf('const SendToPediatrician = ');
const sendToPedEnd = content.indexOf('/* ── Random variation helpers ── */');

const newSendToPed = `const SendToPediatrician = ({ metrics, period, showToast, babies }: { metrics: typeof METRICS; period: string; showToast: any, babies: any[] }) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [selectedBabies, setSelectedBabies] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const sel: Record<string, boolean> = {};
    babies.forEach(b => { if (b.id !== 'loading' && b.id !== 'empty') sel[b.id] = true; });
    setSelectedBabies(sel);
  }, [babies]);

  const toggleBaby = (id: string) => {
    setSelectedBabies(prev => ({...prev, [id]: !prev[id]}));
  };

  const handleSend = async () => {
    const selectedList = babies.filter(b => selectedBabies[b.id]);
    if (selectedList.length === 0) {
      showToast("warning", "Selecciona al menos un perfil para el reporte.");
      return;
    }

    let fullReport = "";
    selectedList.forEach(b => {
      const statsBody = metrics.map(m => {
        const data = period === "24H" ? m.data24H : m.data7D;
        const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);
        return \`• \${m.fullName}: \${m.value} \${m.unit} (Prom: \${avg}, Estado: \${m.status})\`;
      }).join("\\n");
      fullReport += \`=== Reporte de \${b.name} ===\\n\${statsBody}\\n\\n\`;
    });

    const body = \`Reportes Pediátricos TinyCare — \${period === "24H" ? "Últimas 24h" : "Últimos 7 días"}\\n\\n\${fullReport}\${message.trim() ? \`\\nNota del tutor:\\n\${message.trim()}\` : ""}\\n\\n— Enviado desde TinyCare\`;

    setSending(true);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    try {
      if (!MailComposer) {
        showToast("warning", "El módulo de correo no está disponible.");
        setSending(false);
        return;
      }
      const ok = await MailComposer.isAvailableAsync();
      if (!ok) { showToast("warning", "No hay app de correo en este dispositivo."); setSending(false); return; }
      await MailComposer.composeAsync({
        recipients: [],
        subject: \`Reporte Pediátrico TinyCare — \${new Date().toLocaleDateString("es-MX")}\`,
        body,
      });
    } catch { showToast("error", "No se pudo abrir el correo."); }
    setSending(false);
  };

  return (
    <View style={s.pedCard}>
      <View style={s.pedStripe} />
      <View style={s.pedContent}>
        <View style={s.pedHeader}>
          <View style={s.pedIconBox}>
            <Ionicons name="mail" size={20} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.pedTitle}>Enviar al Pediatra</Text>
            <Text style={s.pedSubtitle}>Resumen clínico de perfiles seleccionados</Text>
          </View>
        </View>

        <View style={{ marginTop: 8, marginBottom: 8, gap: 8 }}>
          {babies.filter(b => b.id !== 'loading' && b.id !== 'empty').map(b => (
            <TouchableOpacity key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => toggleBaby(b.id)} activeOpacity={0.7}>
              <View style={[{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, selectedBabies[b.id] ? { backgroundColor: TC.vitalHeart, borderColor: TC.vitalHeart } : { borderColor: '#CBD5E1', backgroundColor: '#FFF' }]}>
                {selectedBabies[b.id] && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: TC.textDark }}>{b.emoji} {b.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.pedPreview}>
          {metrics.map(m => (
            <View key={m.id} style={s.pedPreviewRow}>
              <Ionicons name={m.icon as any} size={14} color={m.color} />
              <Text style={s.pedPreviewLabel}>{m.title}</Text>
              <Text style={[s.pedPreviewVal, { color: m.color }]}>{m.value} {m.unit}</Text>
            </View>
          ))}
        </View>

        <View style={s.pedInputWrap}>
          <Ionicons name="chatbubble-ellipses" size={16} color={TC.vitalOxygen} style={{ marginLeft: 14, marginTop: 2 }} />
          <TextInput
            style={s.pedInput}
            placeholder="Nota breve para el doctor (opcional)"
            placeholderTextColor="#B8A0A3"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={140}
          />
        </View>
        {message.length > 0 && <Text style={s.pedCharCount}>{message.length}/140</Text>}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[s.pedSendBtn, sending && { opacity: 0.6 }]}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={sending}
          >
            <Ionicons name={sending ? "hourglass" : "send"} size={18} color="#FFF" />
            <Text style={s.pedSendText}>{sending ? "Abriendo…" : "Enviar Reporte"}</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={s.pedDisclaimer}>
          <Ionicons name="lock-closed" size={12} color="#94A3B8" />
          <Text style={s.pedDisclaimerText}>Se abrirá tu app de correo</Text>
        </View>
      </View>
    </View>
  );
};

`;
content = content.slice(0, sendToPedStart) + newSendToPed + content.slice(sendToPedEnd);

// 3. Rewrite StatsScreen to include babies state
const statsScreenStart = content.indexOf('export default function StatsScreen() {');
const statsScreenEnd = content.indexOf('return (', statsScreenStart);

const newStatsScreen = `export default function StatsScreen() {
  const { showToast, ToastComponent } = useToast();
  const router = useRouter();
  const [period, setPeriod] = useState<"24H" | "7D">("24H");
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const [liveMetrics, setLiveMetrics] = useState(METRICS);
  
  const [babies, setBabies] = useState<{ id: string, name: string, emoji: string, connected: boolean }[]>([
    { id: 'loading', name: 'Cargando...', emoji: '⏳', connected: false }
  ]);
  const [activeBabyIndex, setActiveBabyIndex] = useState(0);
  const activeBaby = babies[activeBabyIndex] || babies[0];

  useFocusEffect(
    useCallback(() => {
      const perfilesCollection = database.collections.get<Perfil>('perfiles');
      const dispositivosCollection = database.collections.get<Dispositivo>('dispositivos');

      const subscription = perfilesCollection.query().observe().subscribe(async (perfiles) => {
        if (perfiles.length > 0) {
          const allDevices = await dispositivosCollection.query().fetch();
          
          const loadedBabies = perfiles.map((p) => {
            const hasDevice = allDevices.find(d => d.idPerfil === p.id);
            return {
              id: p.id,
              name: p.nombreIdentificador || 'Bebé',
              emoji: p.avatar || '👶🏻',
              connected: hasDevice ? hasDevice.estado === 'activo' : false,
            };
          });
          setBabies(loadedBabies);
          setActiveBabyIndex(prev => prev >= loadedBabies.length ? 0 : prev);
        } else {
          setBabies([{ id: 'empty', name: 'Sin Perfil', emoji: '👶', connected: false }]);
        }
      });
      return () => subscription.unsubscribe();
    }, [])
  );

  // Simulate live telemetry every 3s
  useEffect(() => {
    let ticks = 0;
    const timer = setInterval(() => {
      ticks++;
      const forceAnomaly = ticks % 10 === 0;

      setLiveMetrics(prev => {
        let simulatedData: any = { heartRate: 0, respiratoryRate: 0, oxygenSaturation: 0, temperature: 0 };
        
        const newMetrics = prev.map(m => {
          switch (m.id) {
            case 'spo2': {
              const v = forceAnomaly ? randBetween(85, 92) : randBetween(95, 99);
              simulatedData.oxygenSaturation = v;
              return { ...m, value: String(v), data24H: shiftArray(m.data24H, () => randBetween(-1, 1)), insights: [{ label: 'Promedio', value: \`\${randBetween(96, 98)}%\` }, m.insights[1]] };
            }
            case 'hr': {
              const v = forceAnomaly ? randBetween(175, 205) : randBetween(105, 125);
              simulatedData.heartRate = v;
              return { ...m, value: String(v), data24H: shiftArray(m.data24H, () => randBetween(-4, 4)), insights: [{ label: 'Promedio', value: String(randBetween(108, 118)) }, m.insights[1]] };
            }
            case 'temp': {
              const v = forceAnomaly ? randBetween(39.0, 40.0, 1) : randBetween(36.3, 36.9, 1);
              simulatedData.temperature = v;
              return { ...m, value: String(v), data24H: shiftArray(m.data24H, () => randBetween(-0.2, 0.2, 1)), insights: [{ label: 'Promedio', value: String(randBetween(36.4, 36.7, 1)) }, m.insights[1]] };
            }
            case 'posture': {
              const v = randBetween(70, 95);
              const side = 100 - v;
              return { ...m, value: String(v), data24H: shiftArray(m.data24H, () => randBetween(-5, 5)), insights: [{ label: 'Boca arriba', value: \`\${v}%\` }, { label: 'De lado', value: \`\${side}%\` }] };
            }
            default: return m;
          }
        });

        // evaluadorMedico has been connected inside evaluateBiometrics, which now saves anomalies directly
        evaluateBiometrics(simulatedData);
        return newMetrics;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  `;
content = content.slice(0, statsScreenStart) + newStatsScreen + content.slice(statsScreenEnd);

// 4. SendToPediatrician usage
content = content.replace(
  '<SendToPediatrician metrics={liveMetrics} period={period} showToast={showToast} />',
  '<SendToPediatrician metrics={liveMetrics} period={period} showToast={showToast} babies={babies} />'
);

// 5. Add baby selector in StatsScreen (before toggleRow)
const toggleRowIdx = content.indexOf('<View style={s.toggleRow}>');
const profileSelector = `
        {/* ── Profiles Selector ── */}
        <View style={{ marginHorizontal: -PADDING_H, marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PADDING_H, gap: 10 }}>
            {babies.map((b, index) => {
              const isActive = index === activeBabyIndex;
              return (
                <TouchableOpacity 
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => setActiveBabyIndex(index)}
                  style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: isActive ? TC.vitalHeart : '#FFF', padding: 8, paddingRight: 16, borderRadius: 24, borderWidth: 1, borderColor: isActive ? TC.vitalHeart : TC.inputBorder }]}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <Text style={{ fontSize: 16 }}>{b.emoji}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isActive ? '#FFF' : TC.textDark }}>{b.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        
`;
content = content.slice(0, toggleRowIdx) + profileSelector + content.slice(toggleRowIdx);

fs.writeFileSync(filePath, content);
console.log('Done!');
