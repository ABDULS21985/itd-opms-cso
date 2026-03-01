"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Check,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { SIDEBAR_PRESETS, PRESET_ORDER, type PresetId } from "./presets";
import { createPortal } from "react-dom";

interface SidebarSetupWizardProps {
  open: boolean;
  onClose: () => void;
  allGroups: Array<{ label: string; items: Array<{ label: string }> }>;
  activePreset: PresetId;
  onApplyPreset: (id: PresetId) => void;
  customVisibleSections: string[];
  onSetCustomSections: (sections: string[]) => void;
  onMarkSeen: () => void;
}

export function SidebarSetupWizard({
  open,
  onClose,
  allGroups,
  activePreset,
  onApplyPreset,
  customVisibleSections,
  onSetCustomSections,
  onMarkSeen,
}: SidebarSetupWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPreset, setSelectedPreset] = useState<PresetId>(activePreset);

  const selectablePresets = PRESET_ORDER.filter((id) => id !== "custom");

  const visibleCount = useMemo(() => {
    if (step === 2) {
      return customVisibleSections.length === 0
        ? allGroups.length
        : customVisibleSections.length;
    }
    const preset = SIDEBAR_PRESETS[selectedPreset];
    if (preset.visibleSections.length === 0) return allGroups.length;
    return preset.visibleSections.length;
  }, [step, selectedPreset, customVisibleSections, allGroups]);

  const hiddenCount = allGroups.length - visibleCount;

  function handleSkip() {
    onMarkSeen();
    onClose();
  }

  function handleGoToCustomize() {
    // When entering step 2, seed the custom sections from the selected preset
    const preset = SIDEBAR_PRESETS[selectedPreset];
    if (preset.visibleSections.length === 0) {
      // "full" preset — all sections visible
      onSetCustomSections(allGroups.map((g) => g.label));
    } else {
      onSetCustomSections([...preset.visibleSections]);
    }
    setStep(2);
  }

  function handleToggleSection(label: string) {
    const isAll = customVisibleSections.length === 0;
    let current = isAll ? allGroups.map((g) => g.label) : [...customVisibleSections];

    if (current.includes(label)) {
      current = current.filter((s) => s !== label);
    } else {
      current.push(label);
    }

    onSetCustomSections(current);
    // Switching any toggle forces the preset to "custom"
    setSelectedPreset("custom");
  }

  function handleApply() {
    if (step === 2) {
      onApplyPreset("custom");
    } else {
      onApplyPreset(selectedPreset);
    }
    onMarkSeen();
    onClose();
  }

  function isSectionVisible(label: string): boolean {
    if (customVisibleSections.length === 0) return true;
    return customVisibleSections.includes(label);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Dialog */}
          <motion.div
            className="relative w-full max-w-lg mx-4 rounded-xl border border-white/10 bg-[#1E293B] text-white shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1B7340]/20">
                  <Sparkles className="w-4 h-4 text-[#34D399]" />
                </div>
                <h2 className="text-lg font-semibold">
                  {step === 1 ? "Welcome to CBN OPMS" : "Customize Sidebar"}
                </h2>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mt-3 text-sm text-white/50">
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${
                    step === 1
                      ? "bg-[#1B7340] text-white"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  1
                </span>
                <span className={step === 1 ? "text-white/80" : "text-white/40"}>
                  Choose Preset
                </span>
                <ChevronRight className="w-3 h-3 text-white/30" />
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${
                    step === 2
                      ? "bg-[#1B7340] text-white"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  2
                </span>
                <span className={step === 2 ? "text-white/80" : "text-white/40"}>
                  Customize
                </span>
              </div>
            </div>

            {/* Content area */}
            <div className="px-6 pb-2 max-h-[50vh] overflow-y-auto">
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-white/60 mb-4">
                    Choose a layout preset to get started. You can customize it
                    later.
                  </p>
                  {selectablePresets.map((id) => {
                    const preset = SIDEBAR_PRESETS[id];
                    const isSelected = selectedPreset === id;
                    const tags = preset.visibleSections;
                    const displayTags = tags.length === 0 ? [] : tags.slice(0, 5);
                    const extraCount =
                      tags.length > 5 ? tags.length - 5 : 0;

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedPreset(id)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          isSelected
                            ? "border-[#1B7340] bg-[#1B7340]/10"
                            : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {preset.label}
                              </span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-white/50 mt-0.5">
                              {preset.description}
                            </p>
                          </div>
                        </div>
                        {displayTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {displayTags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 text-white/70"
                              >
                                {tag}
                              </span>
                            ))}
                            {extraCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 text-white/50">
                                +{extraCount} more
                              </span>
                            )}
                          </div>
                        )}
                        {tags.length === 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 text-white/70">
                              All sections
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <p className="text-sm text-white/60 mb-4">
                    Toggle sections on or off to build your ideal sidebar.
                  </p>
                  {allGroups.map((group) => {
                    const visible = isSectionVisible(group.label);
                    return (
                      <button
                        key={group.label}
                        type="button"
                        onClick={() => handleToggleSection(group.label)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          visible
                            ? "border-white/10 bg-white/5"
                            : "border-white/5 bg-white/[0.02] opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {visible ? (
                            <Eye className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-white/30 flex-shrink-0" />
                          )}
                          <div className="text-left">
                            <span className="text-sm font-medium">
                              {group.label}
                            </span>
                            <span className="text-xs text-white/40 ml-2">
                              {group.items.length}{" "}
                              {group.items.length === 1 ? "item" : "items"}
                            </span>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <div
                          className={`relative w-9 h-5 rounded-full transition-colors ${
                            visible ? "bg-[#1B7340]" : "bg-white/20"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                              visible ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary line */}
            <div className="px-6 py-2">
              <p className="text-xs text-white/40">
                {visibleCount} sections visible &middot; {hiddenCount} hidden
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
              <button
                onClick={handleSkip}
                className="text-sm text-white/50 hover:text-white/70 transition-colors"
              >
                Skip
              </button>

              <div className="flex items-center gap-2">
                {step === 2 && (
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                )}

                {step === 1 && (
                  <button
                    onClick={handleGoToCustomize}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-[#1B7340] text-white hover:bg-[#155d33] transition-colors"
                  >
                    Customize
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {step === 2 && (
                  <button
                    onClick={handleApply}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-[#1B7340] text-white hover:bg-[#155d33] transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply Layout
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
