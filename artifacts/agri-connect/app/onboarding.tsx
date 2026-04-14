import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { safeHaptics } from "@/utils/haptics";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import { COMPANY_ACCESS_CODE } from "@/constants/companyCode";
import { UserRole, useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { api, type ExpertDTO } from "@/services/api";

WebBrowser.maybeCompleteAuthSession();

// ── Futuristic dark palette ───────────────────────────────────────────────────
const D = {
  bg: "#060e08",
  bgCard: "rgba(255,255,255,0.05)",
  bgCardStrong: "rgba(255,255,255,0.09)",
  border: "rgba(255,255,255,0.10)",
  borderAccent: "rgba(74,222,128,0.45)",
  borderExpert: "rgba(94,200,220,0.45)",
  primary: "#4ade80",
  expert: "#5ec8dc",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.50)",
  textSubtle: "rgba(255,255,255,0.30)",
  danger: "#f87171",
  warning: "#fbbf24",
  inputBg: "rgba(255,255,255,0.07)",
  glow: "rgba(74,222,128,0.18)",
  glowExpert: "rgba(94,200,220,0.18)",
};

type Step = "role" | "login" | "code" | "describe" | "context" | "diagnosis" | "expert" | "profile";

type DiagnosisResult = {
  title: string;
  category: string;
  urgency: "high" | "medium" | "low";
  suggestions: string[];
  expertSpecialty: string;
};

// Farmer step order for dot indicators
const FARMER_STEPS: Step[] = ["describe", "context", "diagnosis", "expert", "profile"];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { login, register, addConversation, loginWithSession } = useApp();

  const [step, setStep] = useState<Step>("role");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleGoogleSignIn = async () => {
    safeHaptics.light();
    setGoogleError("");
    setGoogleLoading(true);
    try {
      const { url, state } = await api.auth.googleInit();
      await WebBrowser.openBrowserAsync(url, { showTitle: false, enableBarCollapsing: true });
      // Browser closed — start polling for the result
      let attempts = 0;
      const poll = () => {
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const result = await api.auth.googleResult(state);
            if (result.status === "success" && result.user) {
              if (pollRef.current) clearInterval(pollRef.current);
              await loginWithSession(result.user);
              safeHaptics.success();
              router.replace("/(tabs)");
            } else if (result.status === "error") {
              if (pollRef.current) clearInterval(pollRef.current);
              setGoogleError(result.error ?? "خطأ في Google");
              setGoogleLoading(false);
            } else if (attempts > 30) {
              if (pollRef.current) clearInterval(pollRef.current);
              setGoogleError("انتهت مهلة الانتظار — حاول مجدداً");
              setGoogleLoading(false);
            }
          } catch {
            if (attempts > 30) {
              if (pollRef.current) clearInterval(pollRef.current);
              setGoogleLoading(false);
            }
          }
        }, 2000);
      };
      poll();
    } catch (e: any) {
      setGoogleError(e.message ?? "فشل تسجيل الدخول");
      setGoogleLoading(false);
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  const [role, setRole] = useState<UserRole | null>(null);

  // Login
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Expert code
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const codeInputRef = useRef<TextInput>(null);

  // Farmer tunnel
  const [description, setDescription] = useState("");
  const [culture, setCulture] = useState("");
  const [region, setRegion] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [matchedExpert, setMatchedExpert] = useState<ExpertDTO | null>(null);
  const descInputRef = useRef<TextInput>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 20);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 36);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const selectRole = (r: UserRole) => {
    safeHaptics.selection();
    setRole(r);
    if (r === "expert") setStep("code");
    else setStep("describe");
  };

  const verifyCode = () => {
    if (code.trim() === COMPANY_ACCESS_CODE) {
      safeHaptics.success();
      setCodeError(false);
      setStep("profile");
    } else {
      safeHaptics.error();
      setCodeError(true);
      setCode("");
      codeInputRef.current?.focus();
    }
  };

  const doLogin = async () => {
    if (!loginPhone.trim() || !loginPassword.trim()) {
      setLoginError(t.fillPhoneAndPwd);
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    try {
      await login(loginPhone.trim(), loginPassword);
      safeHaptics.success();
      router.replace("/(tabs)");
    } catch (e: any) {
      setLoginError(e.message ?? t.loginFailed);
      safeHaptics.error();
    } finally {
      setLoginLoading(false);
    }
  };

  const doAnalyze = async () => {
    if (!description.trim()) {
      descInputRef.current?.focus();
      return;
    }
    safeHaptics.light();
    setAnalyzing(true);
    try {
      const result = await api.preliminaryDiagnosis({
        description: description.trim(),
        culture: culture.trim(),
        region: region.trim(),
        lang: lang === "ar" ? "ar" : "fr",
      });
      setDiagnosis(result);
      // Also fetch experts to find best match
      try {
        const experts: ExpertDTO[] = await api.experts.list();
        const match = experts.find((e) => e.specialty?.toLowerCase().includes(result.expertSpecialty.toLowerCase()))
          ?? experts[0] ?? null;
        setMatchedExpert(match ?? null);
      } catch { /* no match */ }
      safeHaptics.success();
      setStep("context");
    } catch {
      safeHaptics.error();
    } finally {
      setAnalyzing(false);
    }
  };

  const doAnalyzeFromContext = async () => {
    safeHaptics.light();
    setAnalyzing(true);
    try {
      const result = await api.preliminaryDiagnosis({
        description: description.trim(),
        culture: culture.trim(),
        region: region.trim(),
        lang: lang === "ar" ? "ar" : "fr",
      });
      setDiagnosis(result);
      try {
        const experts: ExpertDTO[] = await api.experts.list();
        const match = experts.find((e) => e.specialty?.toLowerCase().includes(result.expertSpecialty.toLowerCase()))
          ?? experts[0] ?? null;
        setMatchedExpert(match ?? null);
      } catch { /* no match */ }
      safeHaptics.success();
      setStep("diagnosis");
    } catch {
      safeHaptics.error();
    } finally {
      setAnalyzing(false);
    }
  };

  const doRegister = async () => {
    if (!role) return;
    if (!name.trim()) { setRegError(t.nameRequired); return; }
    if (!phone.trim()) { setRegError(t.phoneRequired); return; }
    if (password.length < 6) { setRegError(t.pwdTooShort); return; }
    if (password !== confirmPwd) { setRegError(t.pwdNoMatch); return; }
    setRegLoading(true);
    setRegError("");
    try {
      const newProfile = await register({
        name: name.trim(), phone: phone.trim(), password, role,
        specialty: specialty.trim() || undefined,
        location: (location.trim() || region.trim()) || undefined,
      });
      safeHaptics.success();
      // If farmer had a problem description, auto-create a consultation
      if (role === "client" && description.trim() && newProfile) {
        try {
          const convTitle = culture.trim()
            ? `${culture} — ${description.slice(0, 40)}`
            : description.slice(0, 60);
          await addConversation({
            clientId: newProfile.id,
            clientName: newProfile.name,
            title: convTitle,
            issue: description.trim(),
            status: "open",
          });
        } catch { /* non-blocking */ }
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setRegError(e.message ?? t.registerFailed);
      safeHaptics.error();
    } finally {
      setRegLoading(false);
    }
  };

  const farmerStepIndex = FARMER_STEPS.indexOf(step);

  // ── ROLE SELECTION ──────────────────────────────────────────────────────────
  if (step === "role") {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.rolePad, { paddingTop: topPad, paddingBottom: botPad }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroWrap}>
            <View style={styles.logoRing2} />
            <View style={styles.logoRing1} />
            <View style={styles.logoCircle}>
              <Image source={require("@/assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.appName}>Phytoclinic</Text>
            <Text style={styles.tagline}>{t.taglineLong}</Text>
            <Text style={styles.sub}>{t.onboardingSub}</Text>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>{t.chooseAccount}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={[styles.roleCard, styles.roleCardFarmer]} onPress={() => selectRole("client")} activeOpacity={0.75}>
            <View style={styles.roleCardInner}>
              <View style={[styles.roleIconBg, { backgroundColor: D.glow }]}>
                <Text style={styles.roleEmoji}>🌱</Text>
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>{t.iAmFarmer}</Text>
                <Text style={styles.roleDesc}>{t.farmerDesc}</Text>
              </View>
              <View style={[styles.roleArrow, { backgroundColor: D.primary }]}>
                <Feather name="arrow-left" size={16} color="#060e08" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.roleCard, styles.roleCardExpert]} onPress={() => selectRole("expert")} activeOpacity={0.75}>
            <View style={styles.roleCardInner}>
              <View style={[styles.roleIconBg, { backgroundColor: D.glowExpert }]}>
                <Text style={styles.roleEmoji}>👨‍🔬</Text>
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>{t.iAmExpert}</Text>
                <Text style={styles.roleDesc}>{t.expertDesc}</Text>
              </View>
              <View style={[styles.roleArrow, { backgroundColor: D.expert }]}>
                <Feather name="arrow-left" size={16} color="#060e08" />
              </View>
            </View>
          </TouchableOpacity>

          {googleError ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={D.danger} />
              <Text style={styles.errorText}>{googleError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleBtnText}>متابعة بواسطة Google</Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.invoiceBtn}
            onPress={() => { safeHaptics.light(); Linking.openURL("https://books.zohosecure.eu/portal/phytoclinic"); }}
            activeOpacity={0.7}
          >
            <Feather name="file-text" size={16} color={D.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.invoiceBtnTitle}>{t.invoicePortal}</Text>
              <Text style={styles.invoiceBtnSub}>{t.invoicePortalSub}</Text>
            </View>
            <Feather name="external-link" size={14} color={D.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => setStep("login")} activeOpacity={0.7}>
            <Feather name="log-in" size={15} color={D.textMuted} />
            <Text style={styles.loginLinkText}>{t.haveAccount}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── LOGIN ───────────────────────────────────────────────────────────────────
  if (step === "login") {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.formPad, { paddingTop: topPad, paddingBottom: botPad }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep("role")}>
            <Feather name="arrow-left" size={20} color={D.text} />
          </TouchableOpacity>
          <View style={styles.formHeader}>
            <View style={[styles.formIconRing, { borderColor: D.borderAccent }]}>
              <Feather name="log-in" size={26} color={D.primary} />
            </View>
            <Text style={styles.formTitle}>{t.login}</Text>
          </View>
          {loginError ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={D.danger} />
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}
          <DarkInput label={t.phoneNumber} value={loginPhone} onChange={setLoginPhone} placeholder="+212 6xx xxx xxx" keyboardType="phone-pad" />
          <DarkPassword label={t.password} value={loginPassword} onChange={setLoginPassword} show={showLoginPwd} toggleShow={() => setShowLoginPwd(!showLoginPwd)} onSubmit={doLogin} />
          <TouchableOpacity
            style={[styles.primaryBtn, { opacity: (loginPhone && loginPassword) ? 1 : 0.45 }]}
            onPress={doLogin}
            disabled={loginLoading || !loginPhone || !loginPassword}
            activeOpacity={0.85}
          >
            {loginLoading
              ? <ActivityIndicator color="#060e08" size="small" />
              : <><Text style={styles.primaryBtnText}>{t.enterBtn}</Text><Feather name="arrow-right" size={18} color="#060e08" /></>
            }
          </TouchableOpacity>

          <View style={styles.orDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>أو</Text>
            <View style={styles.dividerLine} />
          </View>

          {googleError ? (
            <View style={[styles.errorBox, { marginBottom: 10 }]}>
              <Feather name="alert-circle" size={14} color={D.danger} />
              <Text style={styles.errorText}>{googleError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleBtnText}>متابعة بواسطة Google</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── EXPERT CODE ─────────────────────────────────────────────────────────────
  if (step === "code") {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.formPad, { paddingTop: topPad, paddingBottom: botPad }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => { setCodeError(false); setCode(""); setStep("role"); }}>
            <Feather name="arrow-left" size={20} color={D.text} />
          </TouchableOpacity>
          <View style={styles.formHeader}>
            <View style={[styles.formIconRing, { borderColor: codeError ? "rgba(248,113,113,0.5)" : D.borderExpert }]}>
              <Feather name={codeError ? "lock" : "shield"} size={26} color={codeError ? D.danger : D.expert} />
            </View>
            <Text style={styles.formTitle}>{t.companyCode}</Text>
            <Text style={styles.formSub}>{t.companyCodeSub}</Text>
          </View>
          <TextInput
            ref={codeInputRef}
            style={[styles.codeInput, codeError && { borderColor: D.danger }]}
            value={code}
            onChangeText={(v) => { setCode(v); if (codeError) setCodeError(false); }}
            placeholder="• • • •"
            placeholderTextColor={D.textSubtle}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={verifyCode}
            autoFocus
          />
          {codeError && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={D.danger} />
              <Text style={styles.errorText}>{t.invalidCode}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: D.expert, opacity: code.trim() ? 1 : 0.4 }]}
            onPress={verifyCode}
            disabled={!code.trim()}
            activeOpacity={0.85}
          >
            <Feather name="check" size={18} color="#060e08" />
            <Text style={styles.primaryBtnText}>{t.verifyCodeBtn}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── FARMER: STEP 1 — DESCRIBE ───────────────────────────────────────────────
  if (step === "describe") {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.formPad, { paddingTop: topPad, paddingBottom: botPad }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* Back + Step dots */}
          <View style={styles.stepHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep("role")}>
              <Feather name="arrow-left" size={20} color={D.text} />
            </TouchableOpacity>
            <StepDots current={0} total={FARMER_STEPS.length} />
          </View>

          {/* Icon + Title */}
          <View style={styles.tunnelHero}>
            <View style={[styles.tunnelIconRing, { borderColor: D.borderAccent, backgroundColor: D.glow }]}>
              <Feather name="clock" size={32} color={D.primary} />
            </View>
            <Text style={[styles.tunnelTitle, { textAlign: "center" }]}>{t.describeTitle}</Text>
            <Text style={styles.tunnelSub}>{t.describeSub}</Text>
          </View>

          {/* Text input */}
          <TextInput
            ref={descInputRef}
            style={styles.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder={t.problemPlaceholder}
            placeholderTextColor={D.textSubtle}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            textAlign={lang === "ar" ? "right" : "left"}
          />

          {/* Analyze button */}
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 16, opacity: description.trim() && !analyzing ? 1 : 0.45 }]}
            onPress={doAnalyze}
            disabled={analyzing || !description.trim()}
            activeOpacity={0.85}
          >
            {analyzing
              ? <><ActivityIndicator color="#060e08" size="small" /><Text style={styles.primaryBtnText}>{t.analyzing}</Text></>
              : <><Text style={styles.primaryBtnText}>{t.analyzeBtn}</Text><Feather name="arrow-right" size={18} color="#060e08" /></>
            }
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity style={styles.skipLink} onPress={() => { safeHaptics.light(); setStep("profile"); }} activeOpacity={0.7}>
            <Text style={styles.skipLinkText}>{t.continueWithoutProblem}</Text>
            <Feather name="chevron-down" size={15} color={D.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── FARMER: STEP 2 — CONTEXT ────────────────────────────────────────────────
  if (step === "context") {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.formPad, { paddingTop: topPad, paddingBottom: botPad }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep("describe")}>
              <Feather name="arrow-left" size={20} color={D.text} />
            </TouchableOpacity>
            <StepDots current={1} total={FARMER_STEPS.length} />
          </View>

          <View style={styles.tunnelHero}>
            <View style={[styles.tunnelIconRing, { borderColor: D.borderAccent, backgroundColor: D.glow }]}>
              <Feather name="map-pin" size={28} color={D.primary} />
            </View>
            <Text style={[styles.tunnelTitle, { textAlign: "center" }]}>{t.contextTitle}</Text>
            <Text style={styles.tunnelSub}>{t.contextSub}</Text>
          </View>

          <DarkInput label={t.yourCulture} value={culture} onChange={setCulture} placeholder={t.culturePlaceholder} />
          <DarkInput label={t.yourRegion} value={region} onChange={setRegion} placeholder={t.regionPlaceholder} />

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 8, opacity: analyzing ? 0.6 : 1 }]}
            onPress={doAnalyzeFromContext}
            disabled={analyzing}
            activeOpacity={0.85}
          >
            {analyzing
              ? <><ActivityIndicator color="#060e08" size="small" /><Text style={styles.primaryBtnText}>{t.analyzing}</Text></>
              : <><Text style={styles.primaryBtnText}>{t.analyzeBtn}</Text><Feather name="arrow-right" size={18} color="#060e08" /></>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── FARMER: STEP 3 — DIAGNOSIS ──────────────────────────────────────────────
  if (step === "diagnosis" && diagnosis) {
    const urgencyColor = diagnosis.urgency === "high" ? D.danger : diagnosis.urgency === "medium" ? D.warning : D.primary;
    const urgencyLabel = diagnosis.urgency === "high" ? t.urgencyHigh : diagnosis.urgency === "medium" ? t.urgencyMedium : t.urgencyLow;

    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.formPad, { paddingTop: topPad, paddingBottom: botPad }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep("context")}>
              <Feather name="arrow-left" size={20} color={D.text} />
            </TouchableOpacity>
            <StepDots current={2} total={FARMER_STEPS.length} />
          </View>

          <View style={styles.tunnelHero}>
            <View style={[styles.tunnelIconRing, { borderColor: `${urgencyColor}60`, backgroundColor: `${urgencyColor}15` }]}>
              <Feather name="activity" size={28} color={urgencyColor} />
            </View>
            <Text style={[styles.tunnelTitle, { textAlign: "center" }]}>{t.diagnosisTitle}</Text>
            <Text style={styles.tunnelSub}>{t.diagnosisReady}</Text>
          </View>

          {/* Diagnosis card */}
          <View style={[styles.diagCard, { borderColor: `${urgencyColor}40` }]}>
            {/* Urgency badge */}
            <View style={[styles.urgencyBadge, { backgroundColor: `${urgencyColor}20`, borderColor: `${urgencyColor}40` }]}>
              <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
              <Text style={[styles.urgencyText, { color: urgencyColor }]}>{urgencyLabel}</Text>
            </View>

            {/* Category */}
            <Text style={styles.diagCategory}>{diagnosis.category}</Text>

            {/* Title */}
            <Text style={styles.diagTitle}>{diagnosis.title}</Text>

            {/* Suggestions */}
            <Text style={styles.diagSugLabel}>{t.suggestionsLabel}</Text>
            {diagnosis.suggestions.map((s, i) => (
              <View key={i} style={styles.diagSugRow}>
                <View style={[styles.diagSugBullet, { backgroundColor: urgencyColor }]} />
                <Text style={styles.diagSugText}>{s}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => { safeHaptics.light(); setStep("expert"); }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t.meetExpert}</Text>
            <Feather name="arrow-right" size={18} color="#060e08" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── FARMER: STEP 4 — EXPERT ─────────────────────────────────────────────────
  if (step === "expert") {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.formPad, { paddingTop: topPad, paddingBottom: botPad }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(diagnosis ? "diagnosis" : "context")}>
              <Feather name="arrow-left" size={20} color={D.text} />
            </TouchableOpacity>
            <StepDots current={3} total={FARMER_STEPS.length} />
          </View>

          <View style={styles.tunnelHero}>
            <View style={[styles.tunnelIconRing, { borderColor: D.borderExpert, backgroundColor: D.glowExpert }]}>
              <Feather name="user-check" size={28} color={D.expert} />
            </View>
            <Text style={[styles.tunnelTitle, { textAlign: "center" }]}>{t.meetExpert}</Text>
          </View>

          {matchedExpert ? (
            <View style={[styles.expertCard, { borderColor: D.borderExpert }]}>
              {/* Avatar */}
              <View style={styles.expertAvatarWrap}>
                <View style={styles.expertAvatar}>
                  <Text style={styles.expertInitials}>
                    {matchedExpert.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={[styles.onlineDot, { backgroundColor: matchedExpert.isOnline ? D.primary : D.border }]} />
              </View>
              <Text style={styles.expertName}>{matchedExpert.name}</Text>
              <View style={styles.expertBadge}>
                <Feather name="award" size={13} color={D.expert} />
                <Text style={styles.expertBadgeText}>{matchedExpert.specialty}</Text>
              </View>
              {matchedExpert.location && (
                <View style={styles.expertLocRow}>
                  <Feather name="map-pin" size={13} color={D.textMuted} />
                  <Text style={styles.expertLocText}>{matchedExpert.location}</Text>
                </View>
              )}
              <Text style={styles.expertNote}>{t.expertWaiting}</Text>
            </View>
          ) : (
            <View style={[styles.expertCard, { borderColor: D.border }]}>
              <View style={styles.expertAvatarWrap}>
                <View style={styles.expertAvatar}>
                  <Feather name="user" size={30} color={D.textMuted} />
                </View>
              </View>
              <Text style={styles.expertNote}>{t.expertWaiting}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => { safeHaptics.light(); setStep("profile"); }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t.continueToRegister}</Text>
            <Feather name="arrow-right" size={18} color="#060e08" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── REGISTER (Step 5 for farmer, final step for expert) ──────────────────────
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.formPad, { paddingTop: topPad, paddingBottom: botPad }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            if (role === "expert") setStep("code");
            else if (step === "profile" && farmerStepIndex > 0) setStep("expert");
            else setStep("role");
          }}>
            <Feather name="arrow-left" size={20} color={D.text} />
          </TouchableOpacity>
          {role === "client" && <StepDots current={4} total={FARMER_STEPS.length} />}
        </View>

        {role === "client" && description.trim() ? (
          <View style={styles.previewBadge}>
            <Feather name="file-text" size={13} color={D.primary} />
            <Text style={styles.previewBadgeText} numberOfLines={1}>{description.slice(0, 50)}{description.length > 50 ? "…" : ""}</Text>
          </View>
        ) : (
          <View style={[styles.rolePill, { borderColor: role === "expert" ? D.borderExpert : D.borderAccent }]}>
            <Feather name={role === "expert" ? "user-check" : "crop"} size={14} color={role === "expert" ? D.expert : D.primary} />
            <Text style={[styles.rolePillText, { color: role === "expert" ? D.expert : D.primary }]}>
              {role === "expert" ? t.iAmExpert : t.iAmFarmer}
            </Text>
          </View>
        )}

        <Text style={styles.formTitle}>{t.createAccount}</Text>

        {regError ? (
          <View style={[styles.errorBox, { marginBottom: 16 }]}>
            <Feather name="alert-circle" size={14} color={D.danger} />
            <Text style={styles.errorText}>{regError}</Text>
          </View>
        ) : null}

        <DarkInput label={t.fullName} value={name} onChange={setName} placeholder={t.fullNamePlaceholder} />
        <DarkInput label={`${t.phoneNumber} *`} value={phone} onChange={setPhone} placeholder="+212 6xx xxx xxx" keyboardType="phone-pad" />
        <DarkPassword label={`${t.password} *`} value={password} onChange={setPassword} show={showPwd} toggleShow={() => setShowPwd(!showPwd)} placeholder={t.passwordPlaceholder} />
        <DarkPassword label={t.confirmPassword} value={confirmPwd} onChange={setConfirmPwd} show={showConfirmPwd} toggleShow={() => setShowConfirmPwd(!showConfirmPwd)} onSubmit={doRegister} placeholder={t.confirmPasswordPlaceholder} />
        {role === "expert" && (
          <DarkInput label={t.specialtyLabel} value={specialty} onChange={setSpecialty} placeholder={t.specialtyPlaceholder} />
        )}
        {!region.trim() && (
          <DarkInput label={t.locationLabel} value={location} onChange={setLocation} placeholder={t.locationPlaceholder} />
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 8, opacity: name.trim() ? 1 : 0.45 }]}
          onPress={doRegister}
          disabled={regLoading || !name.trim()}
          activeOpacity={0.85}
        >
          {regLoading
            ? <ActivityIndicator color="#060e08" size="small" />
            : <><Text style={styles.primaryBtnText}>{t.createAccountBtn}</Text><Feather name="arrow-right" size={18} color="#060e08" /></>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Step dots indicator ───────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === current && dotStyles.dotActive,
            i < current && dotStyles.dotDone,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)" },
  dotActive: { width: 22, backgroundColor: D.primary },
  dotDone: { backgroundColor: `${D.primary}60` },
});

// ── Dark Input Components ─────────────────────────────────────────────────────
function DarkInput({ label, value, onChange, placeholder, keyboardType }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.darkInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={D.textSubtle}
        keyboardType={keyboardType ?? "default"}
        returnKeyType="next"
        autoCorrect={false}
        autoCapitalize="none"
        textAlign="right"
      />
    </View>
  );
}

function DarkPassword({ label, value, onChange, show, toggleShow, onSubmit, placeholder }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.darkPwdRow}>
        <TextInput
          style={styles.darkPwdInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? "••••••"}
          placeholderTextColor={D.textSubtle}
          secureTextEntry={!show}
          returnKeyType={onSubmit ? "done" : "next"}
          onSubmitEditing={onSubmit}
          autoCorrect={false}
          autoCapitalize="none"
          textAlign="right"
        />
        <TouchableOpacity onPress={toggleShow} style={styles.eyeBtn}>
          <Feather name={show ? "eye-off" : "eye"} size={17} color={D.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.bg },
  flex: { flex: 1 },

  // ── Role selection ──
  rolePad: { paddingHorizontal: 22 },

  heroWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 36 },
  logoRing2: {
    position: "absolute", top: 0, width: 170, height: 170, borderRadius: 85,
    borderWidth: 1, borderColor: "rgba(74,222,128,0.10)",
  },
  logoRing1: {
    position: "absolute", top: 15, width: 140, height: 140, borderRadius: 70,
    borderWidth: 1, borderColor: "rgba(74,222,128,0.20)",
  },
  logoCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5, borderColor: D.borderAccent,
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
    shadowColor: D.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  logo: { width: 80, height: 80 },
  appName: { fontSize: 36, fontWeight: "800", color: D.text, letterSpacing: 1, marginBottom: 10 },
  tagline: { fontSize: 17, fontWeight: "700", color: D.text, textAlign: "center", lineHeight: 26, marginBottom: 8 },
  sub: { fontSize: 14, color: D.textMuted, textAlign: "center", lineHeight: 22, paddingHorizontal: 16 },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: D.border },
  dividerLabel: { fontSize: 12, fontWeight: "600", color: D.textSubtle, letterSpacing: 1 },

  roleCard: { borderRadius: 20, borderWidth: 1.5, marginBottom: 14, overflow: "hidden" },
  roleCardFarmer: {
    backgroundColor: "rgba(74,222,128,0.06)", borderColor: D.borderAccent,
    shadowColor: D.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  roleCardExpert: {
    backgroundColor: "rgba(94,200,220,0.06)", borderColor: D.borderExpert,
    shadowColor: D.expert, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  roleCardInner: { flexDirection: "row", alignItems: "center", padding: 18, gap: 14 },
  roleIconBg: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  roleEmoji: { fontSize: 30 },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: 18, fontWeight: "800", color: D.text, textAlign: "right" },
  roleDesc: { fontSize: 13, color: D.textMuted, lineHeight: 19, marginTop: 4, textAlign: "right" },
  roleArrow: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },

  invoiceBtn: {
    flexDirection: "row", alignItems: "center",
    gap: 12, paddingVertical: 14, paddingHorizontal: 16,
    marginTop: 8, marginBottom: 4,
    backgroundColor: "rgba(74,222,128,0.07)",
    borderWidth: 1, borderColor: "rgba(74,222,128,0.25)", borderRadius: 16,
  },
  invoiceBtnTitle: { fontSize: 14, fontWeight: "700", color: D.text, textAlign: "right" },
  invoiceBtnSub: { fontSize: 12, color: D.textMuted, marginTop: 2, textAlign: "right" },

  loginLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  loginLinkText: { fontSize: 15, fontWeight: "600", color: D.textMuted },

  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 15, paddingHorizontal: 20,
    marginTop: 6, marginBottom: 14,
    backgroundColor: "#4285F4",
    borderRadius: 16,
    shadowColor: "#4285F4", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  googleIcon: { fontSize: 18, fontWeight: "900", color: "#fff" },
  googleBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  orDivider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  orText: { fontSize: 13, fontWeight: "600", color: D.textSubtle },

  // ── Forms / tunnel ──
  formPad: { paddingHorizontal: 24 },

  stepHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: D.bgCard, borderWidth: 1, borderColor: D.border,
    alignItems: "center", justifyContent: "center",
  },

  formHeader: { alignItems: "center", marginBottom: 32 },
  formIconRing: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: D.bgCard, marginBottom: 16,
  },
  formTitle: { fontSize: 28, fontWeight: "800", color: D.text, textAlign: "center", letterSpacing: -0.4, marginBottom: 6 },
  formSub: { fontSize: 14, color: D.textMuted, textAlign: "center", lineHeight: 22 },

  // Farmer tunnel header
  tunnelHero: { alignItems: "center", marginBottom: 32 },
  tunnelIconRing: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 2,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  tunnelTitle: { fontSize: 24, fontWeight: "800", color: D.text, lineHeight: 32, marginBottom: 10 },
  tunnelSub: { fontSize: 14, color: D.textMuted, textAlign: "center", lineHeight: 22, paddingHorizontal: 8 },

  // Mic
  micBtnWrap: { alignItems: "center", marginBottom: 20 },
  micBtn: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: D.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: D.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 14,
    marginBottom: 10,
  },
  micLabel: { fontSize: 14, color: D.textMuted, fontWeight: "600" },

  // Description input
  descInput: {
    backgroundColor: D.inputBg, borderWidth: 1, borderColor: D.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: D.text, minHeight: 100,
  },

  // Skip
  skipLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 18 },
  skipLinkText: { fontSize: 14, fontWeight: "600", color: D.textMuted },

  // Diagnosis card
  diagCard: {
    backgroundColor: D.bgCard, borderWidth: 1, borderRadius: 20,
    padding: 20, marginBottom: 24,
  },
  urgencyBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 14,
  },
  urgencyDot: { width: 7, height: 7, borderRadius: 3.5 },
  urgencyText: { fontSize: 12, fontWeight: "700" },
  diagCategory: { fontSize: 12, color: D.textMuted, marginBottom: 6, textAlign: "right" },
  diagTitle: { fontSize: 16, fontWeight: "700", color: D.text, marginBottom: 16, lineHeight: 24, textAlign: "right" },
  diagSugLabel: { fontSize: 13, fontWeight: "700", color: D.textMuted, marginBottom: 10, textAlign: "right" },
  diagSugRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  diagSugBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  diagSugText: { flex: 1, fontSize: 13, color: D.text, lineHeight: 20 },

  // Expert card
  expertCard: {
    backgroundColor: "rgba(94,200,220,0.06)", borderWidth: 1.5, borderRadius: 20,
    padding: 24, alignItems: "center", marginBottom: 24,
  },
  expertAvatarWrap: { position: "relative", marginBottom: 14 },
  expertAvatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "rgba(94,200,220,0.15)",
    borderWidth: 2, borderColor: D.borderExpert,
    alignItems: "center", justifyContent: "center",
  },
  expertInitials: { fontSize: 28, fontWeight: "800", color: D.expert },
  onlineDot: {
    position: "absolute", bottom: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: D.bg,
  },
  expertName: { fontSize: 20, fontWeight: "800", color: D.text, marginBottom: 8 },
  expertBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: "rgba(94,200,220,0.12)",
    borderRadius: 20, marginBottom: 8,
  },
  expertBadgeText: { fontSize: 13, fontWeight: "700", color: D.expert },
  expertLocRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 },
  expertLocText: { fontSize: 13, color: D.textMuted },
  expertNote: { fontSize: 13, color: D.textMuted, textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },

  // Register shared
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    backgroundColor: D.bgCard, marginBottom: 12,
  },
  rolePillText: { fontSize: 13, fontWeight: "700" },
  previewBadge: {
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch",
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1, borderColor: D.borderAccent,
    borderRadius: 14, marginBottom: 12,
  },
  previewBadgeText: { flex: 1, fontSize: 13, color: D.primary, fontWeight: "600" },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(248,113,113,0.10)", borderWidth: 1,
    borderColor: "rgba(248,113,113,0.30)", borderRadius: 12,
    padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: "500", color: D.danger, textAlign: "right" },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: D.textMuted, marginBottom: 7, textAlign: "right" },
  darkInput: {
    height: 52, backgroundColor: D.inputBg, borderWidth: 1, borderColor: D.border,
    borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: D.text,
  },
  darkPwdRow: {
    flexDirection: "row", alignItems: "center", height: 52,
    backgroundColor: D.inputBg, borderWidth: 1, borderColor: D.border,
    borderRadius: 14, paddingHorizontal: 16,
  },
  darkPwdInput: { flex: 1, fontSize: 15, color: D.text },
  eyeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },

  codeInput: {
    height: 68, backgroundColor: D.inputBg, borderWidth: 2, borderColor: D.borderAccent,
    borderRadius: 18, paddingHorizontal: 20, fontSize: 26, fontWeight: "800",
    color: D.text, textAlign: "center", letterSpacing: 8, marginBottom: 16,
  },

  primaryBtn: {
    height: 58, borderRadius: 18, backgroundColor: D.primary,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, marginTop: 20,
  },
  primaryBtnText: { fontSize: 17, fontWeight: "800", color: "#060e08" },
});
