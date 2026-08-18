import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
} from "react-native";
import {
  Text,
  Card,
  Button,
  TextInput,
  IconButton,
  FAB,
  Portal,
  Modal,
  Divider,
  Chip,
} from "react-native-paper";
import {
  FileText,
  Camera,
  Trash2,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Minus as MinusIcon,
  ArrowRight,
  BarChart2,
} from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

// ── helpers ──────────────────────────────────────────────
const pct = (a, b) => {
  if (!a || !b || a === 0) return null;
  return (((b - a) / a) * 100).toFixed(1);
};

const ChangeChip = ({ change, t }) => {
  if (change === null) return null;
  const n = parseFloat(change);
  if (Math.abs(n) < 0.1)
    return (
      <View style={[styles.changeBadge, styles.badgeGray]}>
        <MinusIcon size={11} color="#8A8FA3" />
        <Text style={[styles.changeTxt, { color: "#8A8FA3" }]}>{t("lab_unchanged")}</Text>
      </View>
    );
  if (n > 0)
    return (
      <View style={[styles.changeBadge, styles.badgeRed]}>
        <TrendingUp size={11} color="#E05252" />
        <Text style={[styles.changeTxt, { color: "#E05252" }]}>+{change}%</Text>
      </View>
    );
  return (
    <View style={[styles.changeBadge, styles.badgeGreen]}>
      <TrendingDown size={11} color="#27AE60" />
      <Text style={[styles.changeTxt, { color: "#27AE60" }]}>{change}%</Text>
    </View>
  );
};

// ── main component ────────────────────────────────────────
const LabReportScreen = () => {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [visible, setVisible] = useState(false);
  const [compareVisible, setCompareVisible] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState(null);
  const [valueRows, setValueRows] = useState([{ name: "", value: "", unit: "" }]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const stored = await AsyncStorage.getItem("lab_reports_v2");
      if (stored) {
        setReports(JSON.parse(stored));
      } else {
        // migrate old
        const old = await AsyncStorage.getItem("lab_reports");
        if (old) {
          const migrated = JSON.parse(old).map((r) => ({ ...r, values: [] }));
          saveReports(migrated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveReports = async (newReports) => {
    try {
      await AsyncStorage.setItem("lab_reports_v2", JSON.stringify(newReports));
      setReports(newReports);
    } catch (e) {
      console.error(e);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // value rows management
  const addRow = () =>
    setValueRows((prev) => [...prev, { name: "", value: "", unit: "" }]);

  const removeRow = (idx) =>
    setValueRows((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = (idx, field, val) =>
    setValueRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    );

  const resetForm = () => {
    setTitle(""); setNotes(""); setImage(null);
    setValueRows([{ name: "", value: "", unit: "" }]);
  };

  const addReport = () => {
    if (!title.trim()) return;
    const validValues = valueRows.filter(
      (r) => r.name.trim() && r.value.trim()
    );
    const newReport = {
      id: Date.now().toString(),
      title: title.trim(),
      notes: notes.trim(),
      image,
      date: new Date().toLocaleDateString(),
      values: validValues,
    };
    // newest first
    saveReports([newReport, ...reports]);
    resetForm();
    setVisible(false);
  };

  const deleteReport = (id) =>
    saveReports(reports.filter((r) => r.id !== id));

  // ── comparison helpers ──────────────────────────────────
  const firstReport = reports.length > 0 ? reports[reports.length - 1] : null;
  const latestReport = reports.length > 1 ? reports[0] : null;

  // Build map: testName → { first, latest }
  const buildCompare = () => {
    const map = {};
    (firstReport?.values || []).forEach((v) => {
      map[v.name] = { first: v.value, unit: v.unit, latest: null };
    });
    (latestReport?.values || []).forEach((v) => {
      if (map[v.name]) map[v.name].latest = v.value;
      else map[v.name] = { first: null, unit: v.unit, latest: v.value };
    });
    return map;
  };

  const compareMap = buildCompare();
  const compareKeys = Object.keys(compareMap);

  // ── render ────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── compare banner (when ≥2 reports) ── */}
        {reports.length >= 2 && (
          <TouchableOpacity
            style={styles.compareBanner}
            onPress={() => setCompareVisible(true)}
            activeOpacity={0.85}
          >
            <BarChart2 size={22} color="#FFF" />
            <Text style={styles.compareBannerText}>{t("lab_comparison")}</Text>
            <ArrowRight size={18} color="#FFF" />
          </TouchableOpacity>
        )}

        {reports.length === 0 ? (
          <View style={styles.empty}>
            <FileText size={64} color="#D0D5DD" />
            <Text style={styles.emptyText}>{t("no_reports")}</Text>
          </View>
        ) : (
          reports.map((report, idx) => (
            <Card key={report.id} style={styles.card}>
              <Card.Content>
                {/* header */}
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleLarge" style={styles.reportTitle}>
                      {report.title}
                    </Text>
                    <Text style={styles.date}>{report.date}</Text>
                  </View>
                  {idx === 0 && reports.length > 1 && (
                    <Chip compact style={styles.newBadge} textStyle={{ fontSize: 10 }}>
                      Latest
                    </Chip>
                  )}
                  {idx === reports.length - 1 && reports.length > 1 && (
                    <Chip compact style={styles.firstBadge} textStyle={{ fontSize: 10 }}>
                      1st
                    </Chip>
                  )}
                  <IconButton
                    icon={() => <Trash2 size={18} color="#FF9AA2" />}
                    onPress={() => deleteReport(report.id)}
                    style={{ margin: 0 }}
                  />
                </View>

                {report.notes ? (
                  <Text style={styles.notes}>{report.notes}</Text>
                ) : null}

                {/* numeric values */}
                {report.values && report.values.length > 0 && (
                  <>
                    <Divider style={{ marginVertical: 8 }} />
                    <View style={styles.valuesGrid}>
                      {report.values.map((v, vi) => {
                        // find change vs first report for latest
                        let changeVal = null;
                        if (idx === 0 && firstReport && compareMap[v.name]) {
                          changeVal = pct(
                            parseFloat(compareMap[v.name].first),
                            parseFloat(v.value)
                          );
                        }
                        return (
                          <View key={vi} style={styles.valueBox}>
                            <Text style={styles.valueLabel}>{v.name}</Text>
                            <Text style={styles.valueNum}>
                              {v.value}
                              <Text style={styles.valueUnit}> {v.unit}</Text>
                            </Text>
                            {idx === 0 && reports.length > 1 && (
                              <ChangeChip change={changeVal} t={t} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* image */}
                {report.image ? (
                  <Image
                    source={{ uri: report.image }}
                    style={styles.reportImage}
                  />
                ) : null}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: "#5568FF" }]}
        onPress={() => setVisible(true)}
        color="#FFFFFF"
      />

      {/* ── Add Report Modal ── */}
      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => { setVisible(false); resetForm(); }}
          contentContainerStyle={styles.modal}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {t("add_lab_report")}
            </Text>

            <TextInput
              label={t("report_title")}
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            {/* Value rows */}
            <Text style={styles.sectionLabel}>{t("lab_add_values")}</Text>
            {valueRows.map((row, idx) => (
              <View key={idx} style={styles.valueRow}>
                <RNTextInput
                  placeholder={t("lab_test_name")}
                  value={row.name}
                  onChangeText={(v) => updateRow(idx, "name", v)}
                  style={styles.rowInput}
                  placeholderTextColor="#AAA"
                />
                <RNTextInput
                  placeholder={t("lab_test_value")}
                  value={row.value}
                  onChangeText={(v) => updateRow(idx, "value", v)}
                  style={[styles.rowInput, styles.rowInputSm]}
                  keyboardType="numeric"
                  placeholderTextColor="#AAA"
                />
                <RNTextInput
                  placeholder={t("lab_test_unit")}
                  value={row.unit}
                  onChangeText={(v) => updateRow(idx, "unit", v)}
                  style={[styles.rowInput, styles.rowInputSm]}
                  placeholderTextColor="#AAA"
                />
                <TouchableOpacity
                  onPress={() => removeRow(idx)}
                  style={styles.rowDel}
                  disabled={valueRows.length === 1}
                >
                  <Minus size={16} color={valueRows.length === 1 ? "#CCC" : "#FF9AA2"} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={addRow} style={styles.addRowBtn} activeOpacity={0.7}>
              <Plus size={16} color="#5568FF" />
              <Text style={styles.addRowTxt}>{t("lab_add_row")}</Text>
            </TouchableOpacity>

            {/* Image picker */}
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
              {image ? (
                <Image source={{ uri: image }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Camera size={28} color="#5568FF" />
                  <Text style={{ color: "#64748B", marginTop: 6, fontWeight: "500" }}>{t("select_image")}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                textColor="#64748B"
                style={styles.cancelBtn}
                onPress={() => { setVisible(false); resetForm(); }}
              >
                {t("cancel")}
              </Button>
              <Button
                mode="contained"
                buttonColor="#5568FF"
                textColor="#FFFFFF"
                onPress={addReport}
                style={styles.addBtn}
                labelStyle={styles.addBtnLabel}
              >
                {t("add")}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* ── Comparison Modal ── */}
      <Portal>
        <Modal
          visible={compareVisible}
          onDismiss={() => setCompareVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.compareHeader}>
              <BarChart2 size={22} color="#5568FF" />
              <Text variant="titleLarge" style={styles.compareTitle}>
                {t("lab_comparison")}
              </Text>
            </View>

            {/* dates row */}
            <View style={styles.compareLabelsRow}>
              <View style={[styles.compareLabel, styles.compareLabelFirst]}>
                <Text style={styles.compareLabelTxt}>{t("lab_first_report")}</Text>
                <Text style={styles.compareLabelDate}>{firstReport?.date}</Text>
              </View>
              <ArrowRight size={20} color="#8A8FA3" />
              <View style={[styles.compareLabel, styles.compareLabelLatest]}>
                <Text style={styles.compareLabelTxt}>{t("lab_latest_report")}</Text>
                <Text style={styles.compareLabelDate}>{latestReport?.date}</Text>
              </View>
            </View>

            <Divider style={{ marginBottom: 12 }} />

            {compareKeys.length === 0 ? (
              <Text style={styles.noValuesText}>{t("lab_no_values")}</Text>
            ) : (
              compareKeys.map((key) => {
                const { first, latest, unit } = compareMap[key];
                const change = pct(parseFloat(first), parseFloat(latest));
                const n = change !== null ? parseFloat(change) : null;
                const improved = n !== null && n < 0;   // lower is usually better (e.g. glucose)
                const declined = n !== null && n > 0.1;
                return (
                  <View key={key} style={styles.compareRow}>
                    <Text style={styles.compareTestName}>{key}</Text>
                    <View style={styles.compareValues}>
                      <View style={styles.compareValBox}>
                        <Text style={styles.compareValNum}>{first ?? "—"}</Text>
                        <Text style={styles.compareValUnit}>{unit}</Text>
                      </View>
                      <View style={styles.compareArrow}>
                        {n === null ? (
                          <MinusIcon size={16} color="#CCC" />
                        ) : declined ? (
                          <TrendingUp size={16} color="#E05252" />
                        ) : improved ? (
                          <TrendingDown size={16} color="#27AE60" />
                        ) : (
                          <MinusIcon size={16} color="#8A8FA3" />
                        )}
                        {change !== null && (
                          <Text
                            style={[
                              styles.changePct,
                              {
                                color:
                                  declined ? "#E05252"
                                  : improved ? "#27AE60"
                                  : "#8A8FA3",
                              },
                            ]}
                          >
                            {n > 0 ? "+" : ""}{change}%
                          </Text>
                        )}
                      </View>
                      <View style={styles.compareValBox}>
                        <Text
                          style={[
                            styles.compareValNum,
                            {
                              color:
                                declined ? "#E05252"
                                : improved ? "#27AE60"
                                : "#5A5F73",
                            },
                          ]}
                        >
                          {latest ?? "—"}
                        </Text>
                        <Text style={styles.compareValUnit}>{unit}</Text>
                      </View>
                    </View>
                    {/* status chip */}
                    <View
                      style={[
                        styles.statusChip,
                        declined ? styles.chipRed : improved ? styles.chipGreen : styles.chipGray,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipTxt,
                          {
                            color:
                              declined ? "#E05252"
                              : improved ? "#27AE60"
                              : "#8A8FA3",
                          },
                        ]}
                      >
                        {declined
                          ? t("lab_declined")
                          : improved
                          ? t("lab_improved")
                          : t("lab_unchanged")}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}

            <Button
              mode="contained"
              onPress={() => setCompareVisible(false)}
              style={{ marginTop: 20, backgroundColor: "#5568FF" }}
            >
              {t("cancel")}
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
};

// ── styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FF" },
  content: { padding: 16, paddingBottom: 100 },

  compareBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5568FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    elevation: 3,
    shadowColor: "#5568FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  compareBannerText: {
    flex: 1,
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 16, color: "#B0B5C0" },

  card: { marginBottom: 16, borderRadius: 16, backgroundColor: "#FFF", elevation: 2 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reportTitle: { fontWeight: "bold", color: "#5A5F73" },
  date: { color: "#B0B5C0", fontSize: 12, marginTop: 2 },
  notes: { color: "#8A8FA3", marginTop: 6, fontSize: 13 },

  newBadge: { backgroundColor: "#EEF0FB", height: 24 },
  firstBadge: { backgroundColor: "#FFF5EC", height: 24 },

  valuesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  valueBox: {
    backgroundColor: "#F8F9FF",
    borderRadius: 10,
    padding: 10,
    minWidth: 90,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAECF4",
  },
  valueLabel: { fontSize: 11, color: "#8A8FA3", marginBottom: 2 },
  valueNum: { fontSize: 18, fontWeight: "bold", color: "#5A5F73" },
  valueUnit: { fontSize: 11, color: "#B0B5C0", fontWeight: "normal" },

  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 4,
    gap: 2,
  },
  badgeGreen: { backgroundColor: "#E8F9F0" },
  badgeRed: { backgroundColor: "#FEF0F0" },
  badgeGray: { backgroundColor: "#F3F4FB" },
  changeTxt: { fontSize: 10, fontWeight: "bold" },

  reportImage: { width: "100%", height: 200, borderRadius: 12, marginTop: 10 },

  fab: { position: "absolute", margin: 16, right: 0, bottom: 0, borderRadius: 28 },

  modal: {
    backgroundColor: "white",
    padding: 24,
    margin: 16,
    borderRadius: 20,
    maxHeight: "92%",
  },
  modalTitle: { marginBottom: 16, fontWeight: "bold", color: "#5A5F73" },
  input: { marginBottom: 12 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#5A5F73",
    marginBottom: 8,
    marginTop: 4,
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  rowInput: {
    flex: 2,
    backgroundColor: "#F8F9FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E4F0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#333",
  },
  rowInputSm: { flex: 1 },
  rowDel: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  addRowTxt: { color: "#5568FF", fontWeight: "bold", fontSize: 13 },

  imagePicker: {
    height: 120,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  imagePlaceholder: { alignItems: "center" },
  previewImage: { width: "100%", height: "100%" },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    borderColor: "#CBD5E1",
    borderRadius: 10,
  },
  addBtn: {
    backgroundColor: "#5568FF",
    borderRadius: 10,
    paddingHorizontal: 8,
    elevation: 3,
  },
  addBtnLabel: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  // ── comparison modal ──
  compareHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  compareTitle: { fontWeight: "bold", color: "#5A5F73" },

  compareLabelsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  compareLabel: { flex: 1, alignItems: "center", padding: 10, borderRadius: 10 },
  compareLabelFirst: { backgroundColor: "#FFF5EC" },
  compareLabelLatest: { backgroundColor: "#EEF0FB" },
  compareLabelTxt: { fontWeight: "bold", color: "#5A5F73", fontSize: 12 },
  compareLabelDate: { color: "#8A8FA3", fontSize: 11, marginTop: 2 },

  compareRow: {
    backgroundColor: "#F8F9FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAECF4",
  },
  compareTestName: { fontWeight: "bold", color: "#5A5F73", marginBottom: 8, fontSize: 14 },
  compareValues: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  compareValBox: { alignItems: "center", flex: 1 },
  compareValNum: { fontSize: 20, fontWeight: "bold", color: "#5A5F73" },
  compareValUnit: { fontSize: 10, color: "#B0B5C0" },
  compareArrow: { alignItems: "center", paddingHorizontal: 10 },
  changePct: { fontSize: 11, fontWeight: "bold", marginTop: 2 },
  noValuesText: { color: "#B0B5C0", textAlign: "center", marginVertical: 24 },

  statusChip: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipGreen: { backgroundColor: "#E8F9F0" },
  chipRed: { backgroundColor: "#FEF0F0" },
  chipGray: { backgroundColor: "#F3F4FB" },
  statusChipTxt: { fontSize: 11, fontWeight: "bold" },
});

export default LabReportScreen;
