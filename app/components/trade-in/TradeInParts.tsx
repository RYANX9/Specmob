'use client'

// Compatibility barrel for the previous TradeInParts entry point.
// TradeInFlow is now the single source of truth for the complete trade-in UI.
export {
  CustomStyles,
  Hero,
  StepsGuide,
  SelectedPhoneChip,
  VariantPicker,
  PhonePicker,
  OptionGroup,
  ConditionForm,
  FormSectionHeader,
  ReplacedPartToggle,
  BackButton,
  BatteryHealthDial,
  batteryTier,
  batteryBand,
  batteryPctToHealthScore,
  BATTERY_RANGES,
  SCREEN_OPTIONS,
  BODY_OPTIONS,
  FUNCTIONAL_ITEMS,
  STEPS,
  type TradeInPayload,
} from './TradeInFlow'

export {
  ScoreBar,
  RecommendationCard,
  BudgetRecommendations,
  ResultsView,
} from './TradeInResults'
