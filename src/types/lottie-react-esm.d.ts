declare module 'lottie-react/build/index.es.js' {
  import type { ComponentType } from 'react'

  type LottieProps = {
    animationData: unknown
    loop?: boolean
    autoplay?: boolean
    rendererSettings?: { preserveAspectRatio?: string }
  }

  const Lottie: ComponentType<LottieProps>
  export default Lottie
}

