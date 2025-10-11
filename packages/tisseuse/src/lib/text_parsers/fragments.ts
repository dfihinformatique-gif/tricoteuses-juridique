export interface FragmentPosition {
  start: number
  stop: number
}

export interface FragmentReverseTransformation {
  innerPrefix?: string
  innerSuffix?: string
  outerPrefix?: string
  outerSuffix?: string
  position: FragmentPosition
}
