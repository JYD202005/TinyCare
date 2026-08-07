import React, { useState, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Modal, Alert, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as MailComposer from "expo-mail-composer";
import { TC } from "../../components/theme";
import { useToast } from "../../components/Toast";
import { useAuth } from "@/src/providers/AuthProvider";

// ─── Product Images Map ───────────────────────────────────────────────────────
const PRODUCT_IMAGES: Record<string, any> = {
  "1": require("../../assets/products/oxipulse.png"),
  "2": require("../../assets/products/termoscan.png"),
  "3": require("../../assets/products/postural.png"),
  "4": require("../../assets/products/respira.png"),
  "5": require("../../assets/products/kit.png"),
};

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Data ────────────────────────────────────────────────────────────────────

export type Product = {
  id: string; 
  name: string; 
  desc: string; 
  price: string;
  rating: number; 
  reviews: number; 
  category: string; 
  tags: string[]; 
  colors: string[];
  specs: { label: string; value: string }[];
  features: string[];
  userReviews: { user: string; rating: number; comment: string; date: string }[];
};

const CATEGORIES = ["Todos", "Cachorones PPG", "Cachorones Térmicos", "Cachorones IMU", "Kits Clínicos", "Refacciones"];

const PRODUCTS: Product[] = [
  {
    id: "1", 
    name: "Cachorón OxiPulse", 
    desc: "Cachorón inteligente con sensor PPG de alta sensibilidad (MAX30102) para monitoreo continuo de oximetría y pulso.",
    price: "$1,499", rating: 4.9, reviews: 142, 
    category: "Cachorones PPG", 
    tags: ["SpO₂", "FC", "Grado Médico"], 
    colors: [TC.vitalHeart, TC.vitalOxygen],
    specs: [
      { label: "Sensor", value: "MAX30102 (PPG)" },
      { label: "Protección", value: "IP68 (Sumergible/Lavable)" },
      { label: "Encapsulado", value: "Silicona Biocompatible" },
      { label: "Conectividad", value: "BLE 5.0" }
    ],
    features: ["Monitoreo continuo de oxígeno en sangre", "Registro de frecuencia cardíaca", "Tejido hipoalergénico transpirable", "Batería de extra larga duración"],
    userReviews: [
      { user: "Dra. Martínez", rating: 5, comment: "Excelente precisión en lecturas de SpO2. Muy confiable para monitoreo en casa.", date: "12 May 2026" },
      { user: "Carlos R.", rating: 5, comment: "La tranquilidad que da este nivel de monitoreo médico es invaluable.", date: "05 May 2026" },
    ],
  },
  {
    id: "2", 
    name: "Cachorón TermoScan", 
    desc: "Cachorón con sensor infrarrojo sin contacto (MLX90614) integrado para la detección temprana de anomalías térmicas.",
    price: "$1,299", rating: 4.8, reviews: 98, 
    category: "Cachorones Térmicos", 
    tags: ["Temp IR", "Fiebre", "Clínico"], 
    colors: [TC.vitalTemp, "#FFB74D"],
    specs: [
      { label: "Sensor", value: "MLX90614 (IR)" },
      { label: "Precisión", value: "±0.2°C Médica" },
      { label: "Protección", value: "IP67" },
      { label: "Conectividad", value: "BLE 5.0" }
    ],
    features: ["Sensor infrarrojo sin contacto directo", "Alertas de temperatura predictivas", "Material lavable a máquina", "Sincronización en tiempo real"],
    userReviews: [
      { user: "Laura M.", rating: 5, comment: "Me avisó de un pico de fiebre horas antes de que se notara. Material de primera.", date: "27 Abr 2026" },
    ],
  },
  {
    id: "3", 
    name: "Cachorón Postural", 
    desc: "Monitoreo de higiene postural y prevención de asfixia posicional mediante IMU de 6 ejes.",
    price: "$1,599", rating: 4.7, reviews: 76, 
    category: "Cachorones IMU", 
    tags: ["Postura", "IMU 6-Ejes", "Seguridad"], 
    colors: [TC.vitalActivity, "#7E57C2"],
    specs: [
      { label: "Sensor", value: "MPU6050 (Acel+Giro)" },
      { label: "Monitoreo", value: "Posición 3D continua" },
      { label: "Encapsulado", value: "Silicona Médica" },
      { label: "Conectividad", value: "BLE 5.0" }
    ],
    features: ["Detección de posición prona peligrosa", "Análisis de calidad de sueño por movimiento", "Giroscopio de alta precisión", "Costuras invisibles anti-roce"],
    userReviews: [
      { user: "Sofía V.", rating: 5, comment: "Nos da mucha paz saber en qué posición duerme sin tener que entrar a su cuarto.", date: "26 Abr 2026" },
    ],
  },
  {
    id: "4", 
    name: "Cachorón Respira", 
    desc: "Mide la frecuencia respiratoria de forma precisa mediante una banda piezoeléctrica torácica integrada en el tejido.",
    price: "$1,699", rating: 4.9, reviews: 54, 
    category: "Cachorones PPG", 
    tags: ["Respiración", "Piezo", "Avanzado"], 
    colors: ["#64B5F6", "#1976D2"],
    specs: [
      { label: "Sensor", value: "Banda Piezoeléctrica" },
      { label: "Ubicación", value: "Torácica Integrada" },
      { label: "Protección", value: "IP68 (Lavable)" },
      { label: "Conectividad", value: "BLE 5.0" }
    ],
    features: ["Medición de expansión torácica", "Alertas de apnea infantil", "Calibración automática", "Módulo removible para lavado intenso"],
    userReviews: [
      { user: "Dr. Álvarez (Pediatra)", rating: 5, comment: "Lecturas comparables con equipos de clínica. Excelente desarrollo.", date: "02 May 2026" },
    ],
  },
  {
    id: "5", 
    name: "Kit Clínico Integral", 
    desc: "Sistema completo de monitoreo clínico. Incluye sensores PPG, IR, IMU y Banda Piezoeléctrica en un paquete.",
    price: "$3,999", rating: 5.0, reviews: 214, 
    category: "Kits Clínicos", 
    tags: ["Telemetría", "Kit", "Hospitalario"], 
    colors: [TC.textDark, TC.accent],
    specs: [
      { label: "Sensores", value: "Múltiples (PPG, IR, IMU, Piezo)" },
      { label: "Grado", value: "Hospitalario / Uso en Casa" },
      { label: "Certificación", value: "Biocompatible" },
      { label: "Conectividad", value: "BLE Central" }
    ],
    features: ["Telemetría completa de grado médico", "Estación base de carga", "Suscripción premium a reportes pediátricos", "Soporte técnico prioritario"],
    userReviews: [
      { user: "Elena F.", rating: 5, comment: "La inversión vale cada peso. Es tener terapia intermedia en casa.", date: "24 Abr 2026" },
    ],
  },
  {
    id: "6", 
    name: "Módulo Sensor PPG (Repuesto)", 
    desc: "Módulo MAX30102 de reemplazo. Fácil instalación en Cachorones OxiPulse.",
    price: "$349", rating: 4.8, reviews: 24, 
    category: "Refacciones", 
    tags: ["Sensor", "MAX30102"], 
    colors: [TC.textMuted, "#CBD5E1"],
    specs: [
      { label: "Tipo", value: "Repuesto Original" },
      { label: "Compatibilidad", value: "Cachorón OxiPulse" }
    ],
    features: ["Instalación plug-and-play", "Sellado hermético IP68"],
    userReviews: []
  },
  {
    id: "7", 
    name: "Batería Li-Po 500mAh", 
    desc: "Batería de polímero de litio de grado médico para autonomía extendida.",
    price: "$299", rating: 4.9, reviews: 45, 
    category: "Refacciones", 
    tags: ["Energía", "Batería"], 
    colors: ["#10B981", "#34D399"],
    specs: [
      { label: "Capacidad", value: "500mAh / 3.7V" },
      { label: "Ciclos", value: ">1000 recargas" }
    ],
    features: ["Protección contra sobrecarga", "Diseño ultradelgado"],
    userReviews: []
  },
  {
    id: "8", 
    name: "Base de Carga Magnética", 
    desc: "Cable y base magnética pogo-pin para carga segura e impermeable.",
    price: "$199", rating: 4.7, reviews: 89, 
    category: "Refacciones", 
    tags: ["Carga", "Accesorios"], 
    colors: ["#3B82F6", "#93C5FD"],
    specs: [
      { label: "Conector", value: "Pogo-pin 4 contactos" },
      { label: "Cable", value: "1.5m trenzado" }
    ],
    features: ["Acople magnético seguro", "Carga rápida (1H a 100%)"],
    userReviews: []
  }
];

// ─── UI Components ───────────────────────────────────────────────────────────

const ProductImage: React.FC<{ productId: string; style?: any; color?: string }> = ({ productId, style, color = TC.textMuted }) => {
  const img = PRODUCT_IMAGES[productId];
  if (img) {
    return <Image source={img} style={[{ resizeMode: 'cover' }, style]} />;
  }
  // Fallback for accessories/spare parts without a dedicated image
  return (
    <View style={[{ backgroundColor: TC.trackBg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name="hardware-chip-outline" size={style?.width ? style.width * 0.4 : 24} color={color} style={{ opacity: 0.6 }} />
    </View>
  );
};

const Stars: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => (
  <View style={{ flexDirection: "row", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons
        key={s}
        name={s <= Math.floor(rating) ? "star" : s - 0.5 <= rating ? "star-half" : "star-outline"}
        size={size} color="#4A5568"
      />
    ))}
  </View>
);

export type CartItem = {
  product: Product;
  quantity: number;
};

// ─── Product Detail Modal ────────────────────────────────────────────────────

const ProductModal: React.FC<{ product: Product | null; visible: boolean; onClose: () => void; onAddToCart: (p: Product) => void; }> = ({
  product, visible, onClose, onAddToCart
}) => {
  const [tab, setTab] = useState<"specs" | "reviews">("specs");
  if (!product) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View style={modal.header}>
              <ProductImage productId={product.id} style={modal.imageBox} color={product.colors[0]} />
              <View style={{ flex: 1 }}>
                <Text style={modal.name}>{product.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <Stars rating={product.rating} size={14} />
                  <Text style={modal.ratingText}>{product.rating} ({product.reviews} verificadas)</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
                <Ionicons name="close" size={20} color={TC.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={modal.price}>{product.price} MXN</Text>
            <Text style={modal.desc}>{product.desc}</Text>

            {/* Tags */}
            <View style={modal.tagsRow}>
              {product.tags.map((t) => (
                <View key={t} style={[modal.tag, { borderColor: product.colors[0] }]}>
                  <Text style={[modal.tagText, { color: product.colors[0] }]}>{t}</Text>
                </View>
              ))}
            </View>

            {/* Tab Switcher */}
            <View style={modal.tabRow}>
              {(["specs", "reviews"] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => setTab(t)}
                  style={[modal.tabBtn, tab === t && modal.tabBtnActive]}>
                  <Text style={[modal.tabText, tab === t && modal.tabTextActive]}>
                    {t === "specs" ? "Especificaciones" : `Reseñas (${product.userReviews.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === "specs" ? (
              <View style={modal.featureList}>
                <Text style={modal.sectionSubtitle}>HARDWARE CLÍNICO</Text>
                {product.specs.map((s, i) => (
                  <View key={i} style={modal.specRow}>
                    <Text style={modal.specLabel}>{s.label}</Text>
                    <Text style={modal.specValue}>{s.value}</Text>
                  </View>
                ))}
                
                <Text style={[modal.sectionSubtitle, { marginTop: 16 }]}>CARACTERÍSTICAS</Text>
                {product.features.map((f, i) => (
                  <View key={i} style={modal.featureRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={product.colors[0]} />
                    <Text style={modal.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={modal.reviewsList}>
                {product.userReviews.map((r, i) => (
                  <View key={i} style={[modal.reviewCard, i < product.userReviews.length - 1 && modal.reviewBorder]}>
                    <View style={modal.reviewHeader}>
                      <Text style={modal.reviewUser}>{r.user}</Text>
                      <Stars rating={r.rating} size={12} />
                    </View>
                    <Text style={modal.reviewComment}>{r.comment}</Text>
                    <Text style={modal.reviewDate}>{r.date}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity style={modal.cta} activeOpacity={0.8} onPress={() => onAddToCart(product)}>
              <Ionicons name="cart" size={18} color="#FFF" />
              <Text style={modal.ctaText}>Añadir al Carrito</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Cart Modal ──────────────────────────────────────────────────────────────

const CartModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}> = ({ visible, onClose, cart, onUpdateQuantity, onRemove, onCheckout }) => {
  const parsePrice = (priceStr: string) => parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
  const total = cart.reduce((sum, item) => sum + parsePrice(item.product.price) * item.quantity, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modal.overlay}>
        <View style={[modal.sheet, { height: '80%' }]}>
          <View style={modal.handle} />
          
          <View style={[modal.header, { justifyContent: 'space-between', position: 'relative' }]}>
            <Text style={modal.name}>Tu Carrito</Text>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Ionicons name="close" size={20} color={TC.textDark} />
            </TouchableOpacity>
          </View>

          {cart.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
              <Ionicons name="cart-outline" size={64} color={TC.textMuted} style={{ opacity: 0.5 }} />
              <Text style={{ fontSize: 16, color: TC.textMuted, fontWeight: '500' }}>El carrito está vacío</Text>
              <TouchableOpacity style={[modal.cta, { width: '80%', marginTop: 24 }]} onPress={onClose}>
                <Text style={modal.ctaText}>Seguir Comprando</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
                {cart.map((item) => (
                  <View key={item.product.id} style={cartStyles.itemRow}>
                    <ProductImage productId={item.product.id} style={cartStyles.itemImage} color={item.product.colors[0]} />
                    <View style={cartStyles.itemInfo}>
                      <Text style={cartStyles.itemName} numberOfLines={1}>{item.product.name}</Text>
                      <Text style={cartStyles.itemPrice}>{item.product.price} MXN</Text>
                      <View style={cartStyles.qtyRow}>
                        <TouchableOpacity onPress={() => onUpdateQuantity(item.product.id, -1)} style={cartStyles.qtyBtn}>
                          <Ionicons name="remove" size={16} color={TC.textDark} />
                        </TouchableOpacity>
                        <Text style={cartStyles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => onUpdateQuantity(item.product.id, 1)} style={cartStyles.qtyBtn}>
                          <Ionicons name="add" size={16} color={TC.textDark} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => onRemove(item.product.id)} style={cartStyles.removeBtn}>
                      <Ionicons name="trash-outline" size={20} color={TC.vitalHeart} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              
              <View style={cartStyles.footer}>
                <View style={cartStyles.totalRow}>
                  <Text style={cartStyles.totalLabel}>Total a pagar:</Text>
                  <Text style={cartStyles.totalAmount}>${total.toLocaleString('es-MX')} MXN</Text>
                </View>
                <TouchableOpacity style={modal.cta} activeOpacity={0.8} onPress={onCheckout}>
                  <Text style={modal.ctaText}>Proceder al Pago</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Store Screen ────────────────────────────────────────────────────────────

export default function StoreScreen() {
  const { showToast, ToastComponent } = useToast();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const filtered = PRODUCTS.filter((p) => activeCategory === "Todos" || p.category === activeCategory);

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSelectedProduct(null);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // ── Checkout via email ──────────────────────────────────────────────────────
  const STORE_EMAIL = "anti72970@gmail.com";

  const handleCheckout = async () => {
    if (!user) {
      showToast("warning", "Necesitas iniciar sesión para realizar pedidos.");
      setIsCartVisible(false);
      return;
    }

    const parsePrice = (priceStr: string) => parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
    const total = cart.reduce((sum, item) => sum + parsePrice(item.product.price) * item.quantity, 0);
    const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

    const itemsText = cart.map((item) =>
      `  • ${item.product.name} (x${item.quantity}) — ${item.product.price} MXN c/u`
    ).join("\n");

    const body = `
══════════════════════════════
  NUEVO PEDIDO — TINYCARE STORE
══════════════════════════════
Fecha: ${fecha}

PRODUCTOS:
${itemsText}

──────────────────────────────
TOTAL: $${total.toLocaleString("es-MX")} MXN
══════════════════════════════
Enviado desde la app TinyCare.
Por favor confirmen disponibilidad y método de pago.
`.trim();

    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Sin cliente de correo",
          "No se encontró una aplicación de correo configurada. Instala una cuenta de correo e intenta de nuevo."
        );
        return;
      }

      await MailComposer.composeAsync({
        recipients: [STORE_EMAIL],
        subject: `Pedido TinyCare — ${fecha}`,
        body,
        isHtml: false,
      });

      setIsCartVisible(false);
      setCart([]);
    } catch (e) {
      console.error("[Checkout]", e);
      showToast("error", "No se pudo abrir el cliente de correo.");
    }
  };

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.9], extrapolate: "clamp" });

  return (
    <View style={s.root}>
      {ToastComponent}
      <Animated.ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <Animated.View style={[s.header, { opacity: headerOpacity }]}>
          <View>
            <Text style={s.subtitle}>EQUIPO MÉDICO CERTIFICADO</Text>
            <Text style={s.title}>TinyCare Store</Text>
          </View>
          <TouchableOpacity style={s.cartBtn} activeOpacity={0.7} onPress={() => setIsCartVisible(true)}>
            <Ionicons name="bag-outline" size={22} color={TC.textDark} />
            {cart.length > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerContent}>
            <View style={s.bannerIconBox}>
              <Ionicons name="medical" size={24} color="#FFF" />
            </View>
            <Text style={s.bannerTitle}>Precisión de Grado Clínico</Text>
            <Text style={s.bannerDesc}>
              Sensores encapsulados en silicona médica biocompatible. Telemetría vía BLE con protección IP67/IP68. Lavables y seguros.
            </Text>
          </View>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catsRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c} activeOpacity={0.7} onPress={() => setActiveCategory(c)}
              style={[s.catPill, activeCategory === c && s.catPillActive]}>
              <Text style={[s.catText, activeCategory === c && s.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Product Grid */}
        <View style={s.grid}>
          {filtered.map((p) => (
            <TouchableOpacity key={p.id} style={s.card} activeOpacity={0.8} onPress={() => setSelectedProduct(p)}>
              <ProductImage productId={p.id} style={s.cardImage} color={p.colors[0]} />
              <View style={s.cardBody}>
                <View style={s.cardMetaTop}>
                  <Text style={s.cardCategory}>{p.category.toUpperCase()}</Text>
                  <View style={s.ratingBadge}>
                    <Ionicons name="star" size={10} color={TC.textDark} />
                    <Text style={s.ratingBadgeText}>{p.rating}</Text>
                  </View>
                </View>
                <Text style={s.cardName}>{p.name}</Text>
                <Text style={s.cardDesc} numberOfLines={2}>{p.desc}</Text>
                
                <View style={s.cardFooter}>
                  <Text style={s.cardPrice}>{p.price}</Text>
                  <View style={s.cardTags}>
                    {p.tags.slice(0, 1).map((t) => (
                      <Text key={t} style={s.miniTagText}>{t}</Text>
                    ))}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Copyright / Info Footer */}
        <View style={s.footer}>
          <Ionicons name="information-circle-outline" size={20} color={TC.textMuted} />
          <Text style={s.footerTitle}>Información Regulatoria</Text>
          <Text style={s.footerText}>
            Todos los componentes biométricos cumplen con la normativa NOM-151 y certificación CE.
            Encapsulado IP67/IP68 resistente a fluidos corporales y lavados intensivos.
            © 2026 TinyCare — InnovaTecNM.
          </Text>
        </View>
      </Animated.ScrollView>

      <ProductModal 
        product={selectedProduct} 
        visible={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        onAddToCart={handleAddToCart}
      />
      <CartModal
        visible={isCartVisible}
        onClose={() => setIsCartVisible(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveFromCart}
        onCheckout={handleCheckout}
      />
    </View>
  );
}

// ─── Page Styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' }, // Lighter, more clinical background
  scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 120, gap: 24 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 4 },
  subtitle: { fontSize: 11, fontWeight: "800", color: TC.textMuted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 },
  title: { fontSize: 32, fontWeight: "700", color: TC.textDark, letterSpacing: -1 },
  cartBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF',
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cartBadge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: TC.vitalHeart, minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F8FAFC'
  },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  banner: { 
    backgroundColor: '#1E293B', // Dark slate for a premium tech feel
    borderRadius: 16, 
    padding: 24,
    borderCurve: "continuous" as any,
  },
  bannerContent: { alignItems: "flex-start" },
  bannerIconBox: { 
    width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', 
    alignItems: 'center', justifyContent: 'center', marginBottom: 16 
  },
  bannerTitle: { fontSize: 20, fontWeight: "700", color: "#FFF", letterSpacing: -0.5, marginBottom: 8 },
  bannerDesc: { fontSize: 14, fontWeight: "400", color: "#CBD5E1", lineHeight: 22 },

  catsRow: { gap: 8, paddingVertical: 4 },
  catPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
  },
  catPillActive: { backgroundColor: TC.textDark, borderColor: TC.textDark },
  catText: { fontSize: 13, fontWeight: "600", color: '#64748B' },
  catTextActive: { color: "#FFF" },

  grid: { gap: 16 },
  card: {
    flexDirection: "row", backgroundColor: '#FFF', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#F1F5F9', borderCurve: "continuous" as any,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2,
  },
  cardImage: {
    width: 100, height: 120, borderRadius: 12, marginRight: 16,
  },
  cardBody: { flex: 1, justifyContent: 'center' },
  cardMetaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardCategory: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 4 },
  ratingBadgeText: { fontSize: 11, fontWeight: '700', color: TC.textDark },
  cardName: { fontSize: 16, fontWeight: "700", color: TC.textDark, letterSpacing: -0.3, marginBottom: 4 },
  cardDesc: { fontSize: 13, fontWeight: "400", color: '#64748B', lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPrice: { fontSize: 16, fontWeight: "700", color: TC.textDark },
  cardTags: { flexDirection: "row", gap: 6 },
  miniTagText: { fontSize: 11, fontWeight: "600", color: '#64748B', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  footer: {
    alignItems: "center", paddingTop: 32, paddingBottom: 16, gap: 12,
  },
  footerTitle: { fontSize: 12, fontWeight: "700", color: TC.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  footerText: { fontSize: 12, fontWeight: "400", color: '#94A3B8', textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },
});

// ─── Modal Styles ────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "90%", paddingHorizontal: 24, paddingTop: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1',
    alignSelf: "center", marginBottom: 24,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  imageBox: {
    width: 80, height: 80, borderRadius: 16, borderCurve: "continuous" as any,
  },
  name: { fontSize: 20, fontWeight: "700", color: TC.textDark, letterSpacing: -0.5 },
  ratingText: { fontSize: 13, fontWeight: "500", color: '#64748B' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9',
    alignItems: "center", justifyContent: "center", position: 'absolute', top: 0, right: 0
  },
  price: { fontSize: 24, fontWeight: "700", color: TC.textDark, marginBottom: 12 },
  desc: { fontSize: 15, fontWeight: "400", color: '#475569', lineHeight: 24, marginBottom: 20 },
  tagsRow: { flexDirection: "row", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  tag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: "600" },
  tabRow: {
    flexDirection: "row", backgroundColor: '#F1F5F9', borderRadius: 8, padding: 4, marginBottom: 24,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  tabBtnActive: { backgroundColor: '#FFF', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: "600", color: '#64748B' },
  tabTextActive: { color: TC.textDark },
  
  featureList: { gap: 12, marginBottom: 32 },
  sectionSubtitle: { fontSize: 11, fontWeight: "800", color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  specLabel: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  specValue: { fontSize: 14, fontWeight: '600', color: TC.textDark, fontFamily: 'System', fontVariant: ['tabular-nums'] },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  featureText: { fontSize: 14, fontWeight: "500", color: '#475569', flex: 1 },
  
  reviewsList: { marginBottom: 32 },
  reviewCard: { paddingVertical: 16 },
  reviewBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reviewUser: { fontSize: 14, fontWeight: "700", color: TC.textDark },
  reviewComment: { fontSize: 14, fontWeight: "400", color: '#475569', lineHeight: 22, marginBottom: 8 },
  reviewDate: { fontSize: 12, fontWeight: "500", color: '#94A3B8' },
  
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 12, marginBottom: 24, backgroundColor: TC.textDark,
  },
  ctaText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});

const cartStyles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', 
    borderRadius: 16, padding: 12, gap: 12, borderWidth: 1, borderColor: '#F1F5F9'
  },
  itemImage: { width: 64, height: 64, borderRadius: 12 },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 14, fontWeight: '700', color: TC.textDark, letterSpacing: -0.3 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: TC.textDark },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  qtyBtn: { 
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  qtyText: { fontSize: 14, fontWeight: '700', color: TC.textDark, minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 8 },
  footer: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, paddingBottom: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  totalAmount: { fontSize: 24, fontWeight: '800', color: TC.textDark },
});
