import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FiImage, FiMenu, FiRefreshCw, FiDownload, FiCopy,
  FiLogOut, FiLoader, FiTrash2, FiMaximize2, FiArrowUp
} from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { generateImage, checkGenerationStatus, type GenerationHistory, getGenerationHistory, saveGenerationHistory, deleteGenerationHistory } from './services/imageService'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SavedLoraSection } from './components/SavedLora'
import { SavedLora } from './services/loraService'
import { ImageModal } from './components/ImageModal'

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [credits] = useState(110)
  const { user, signInWithGoogle, signOut } = useAuth()

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
                <FiImage className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold text-white">Rusher AI</span>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="sm:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
            aria-label="Open main menu"
            aria-expanded="false"
          >
            <FiMenu size={24} />
          </button>
          
          <div className="hidden sm:flex items-center space-x-4">
            {user ? (
              <>
                {/* Credits display */}
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gray-800 rounded-full">
                  <span className="text-purple-400">✨</span>
                  <span className="text-white font-medium">{credits}</span>
                </div>
                
                {/* User menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-800">
                    <img
                      src={user.photoURL || ''}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                    <FiMenu className="text-gray-400" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-1 invisible group-hover:visible">
                    <div className="px-4 py-2 border-b border-gray-700">
                      <p className="text-sm text-white font-medium">{user.displayName}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <FiLogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FcGoogle size={20} />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={isOpen ? "open" : "closed"}
        variants={{
          open: { opacity: 1, height: "auto" },
          closed: { opacity: 0, height: 0 }
        }}
        className="sm:hidden overflow-hidden bg-gray-800"
      >
        <div className="px-4 py-3 space-y-3">
          {user ? (
            <>
              <div className="flex items-center space-x-3 px-3 py-2 bg-gray-700 rounded-lg">
                <img
                  src={user.photoURL || ''}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <p className="text-sm text-white font-medium">{user.displayName}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-purple-400">✨</span>
                  <span className="text-white font-medium">{credits} credits</span>
                </div>
                <button className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-full text-sm">
                  Upgrade
                </button>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-lg flex items-center space-x-2"
              >
                <FiLogOut size={16} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FcGoogle size={20} />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </motion.div>
    </nav>
  )
}

const ImageGenerator = () => {
  const [selectedModel, setSelectedModel] = useState('flux-dev')
  const [numImages, setNumImages] = useState(1)
  const [prompt, setPrompt] = useState('')
  const [seed, setSeed] = useState('')
  const [selectedLoras, setSelectedLoras] = useState<SavedLora[]>([])
  const [loraScales, setLoraScales] = useState<Record<string, number>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sliderValues, setSliderValues] = useState({
    promptStrength: 0.8,
    steps: 28,
    guidanceScale: 3.5
  })
  const [generationHistory, setGenerationHistory] = useState<GenerationHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const models = [
    { id: 'flux-dev', name: 'FLUX DEV', icon: '🎨' },
    { id: 'stable-xl', name: 'Stable XL', icon: '🖼️' },
    { id: 'sdxl', name: 'SDXL', icon: '✨' },
  ]

  const dimensions = [
    { id: '1:1', label: 'Square', width: 1024, height: 1024 },
    { id: '3:4', label: 'Portrait', width: 1024, height: 1365 },
    { id: '4:3', label: 'Landscape', width: 1365, height: 1024 },
  ]

  const availableLoras = [
    {
      id: "Roshmikax/manelx",
      name: "Roshmikax/manelx",
      defaultScale: 0.8,
      hfPath: "Roshmikax/manelx"
    },
    {
      id: "Roshmikax/navodi",
      name: "Roshmikax/navodi",
      defaultScale: 0.5,
      hfPath: "Roshmikax/navodi"
    }
  ]

  const handleSliderChange = (setting: string, value: string) => {
    setSliderValues(prev => ({
      ...prev,
      [setting.toLowerCase().replace(/\s+/g, '')]: parseFloat(value)
    }))
  }

  // Load generation history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true)
        const history = await getGenerationHistory(10)
        setGenerationHistory(history)
      } catch (error) {
        console.error('Error loading history:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()
  }, [])

  const handleSelectSavedLora = (lora: SavedLora) => {
    // Check if LoRA is already selected
    const isSelected = selectedLoras.some(l => l.id === lora.id)
    
    if (isSelected) {
      // Remove LoRA from selected list
      setSelectedLoras(prev => prev.filter(l => l.id !== lora.id))
      
      // Remove trigger word from prompt if it exists
      if (lora.triggerWord) {
        setPrompt(prev => prev.replace(lora.triggerWord, '').trim())
      }
      
      // Remove scale value
      const newScales = { ...loraScales }
      delete newScales[lora.hfPath]
      setLoraScales(newScales)
    } else {
      // Add LoRA to selected list
      setSelectedLoras(prev => [...prev, lora])
      
      // Add trigger word to prompt if it exists
      if (lora.triggerWord) {
        setPrompt(prev => {
          const newPrompt = prev.trim()
          return newPrompt ? `${newPrompt} ${lora.triggerWord}` : lora.triggerWord
        })
      }
      
      // Set default scale value
      setLoraScales(prev => ({
        ...prev,
        [lora.hfPath]: lora.defaultScale || 0.8
      }))
    }
  }

  const handleGenerate = async () => {
    if (!prompt) {
      setError('Please enter a prompt')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)
      setGeneratedImages([])

      const settings = {
        model: selectedModel,
        numImages,
        width: 512,
        height: 512,
        guidanceScale: sliderValues.guidanceScale,
        steps: sliderValues.steps,
        promptStrength: sliderValues.promptStrength,
        ...(seed ? { seed } : {}),
        loras: selectedLoras.map(lora => ({
          path: lora.hfPath,
          scale: loraScales[lora.hfPath] || lora.defaultScale || 0.8
        }))
      }

      // Start the generation
      const response = await generateImage({
        prompt,
        num_outputs: numImages,
        width: settings.width,
        height: settings.height,
        guidance_scale: settings.guidanceScale,
        num_inference_steps: settings.steps,
        prompt_strength: settings.promptStrength,
        ...(seed ? { seed: parseInt(seed) } : {}),
        loras: selectedLoras.map(lora => ({
          path: lora.hfPath,
          scale: loraScales[lora.hfPath] || lora.defaultScale || 0.8
        }))
      })

      setGenerationId(response.id)

      // Poll for completion
      let completed = false
      while (!completed) {
        const status = await checkGenerationStatus(response.id)
        
        if (status.status === 'succeeded' && status.urls) {
          completed = true
          // Save to history after successful generation
          await saveGenerationHistory(prompt, status.urls, settings)
          // Refresh history immediately
          const newHistory = await getGenerationHistory(10)
          setGenerationHistory(newHistory)
          setGeneratedImages(status.urls)
        } else if (status.status === 'failed' || status.error) {
          throw new Error(status.error || 'Generation failed')
        }

        // Wait before next poll if not completed
        if (!completed) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      setIsGenerating(false)
    } catch (err: any) {
      console.error('Error during generation:', err)
      setError(err.response?.data?.error || err.message || 'Failed to generate image')
      setIsGenerating(false)
    }
  }

  const handleScaleChange = (loraPath: string, newScale: number) => {
    setLoraScales(prev => ({
      ...prev,
      [loraPath]: newScale
    }))
  }

  useEffect(() => {
    let intervalId: number | null = null

    const checkStatus = async () => {
      if (!generationId) return

      try {
        const response = await checkGenerationStatus(generationId)

        if (response.status === 'succeeded') {
          setGeneratedImages(response.urls || [])
          setIsGenerating(false)
          setGenerationId(null)
          if (intervalId) window.clearInterval(intervalId)
        } else if (response.status === 'failed') {
          setError(response.error || 'Generation failed')
          setIsGenerating(false)
          setGenerationId(null)
          if (intervalId) window.clearInterval(intervalId)
        }
      } catch (err: any) {
        console.error('Error checking status:', err)
        setError(err.response?.data?.error || 'Failed to check generation status')
        setIsGenerating(false)
        setGenerationId(null)
        if (intervalId) window.clearInterval(intervalId)
      }
    }

    if (generationId) {
      intervalId = window.setInterval(checkStatus, 1000)
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [generationId])

  const handleDeleteHistory = async (historyId: string) => {
    if (!window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(historyId);
      await deleteGenerationHistory(historyId);
      // Refresh history after deletion
      const newHistory = await getGenerationHistory(10);
      setGenerationHistory(newHistory);
    } catch (error) {
      console.error('Error deleting history:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Model Selection */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Select Model</h2>
              <div className="space-y-2">
                {models.map(model => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`w-full flex items-center p-3 rounded-lg ${
                      selectedModel === model.id
                        ? 'bg-gradient-to-r from-purple-600 to-blue-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    } transition-colors`}
                  >
                    <span className="text-xl mr-2">{model.icon}</span>
                    <span>{model.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Settings */}
            <div className="bg-gray-800 rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Number of Images</h3>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      onClick={() => setNumImages(num)}
                      className={`p-2 text-center rounded-lg ${
                        numImages === num
                          ? 'bg-gradient-to-r from-purple-600 to-blue-500'
                          : 'bg-gray-700 hover:bg-gray-600'
                      } transition-colors`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Image Dimensions</h3>
                <div className="grid grid-cols-4 gap-2">
                  {dimensions.map(dim => (
                    <button
                      key={dim.id}
                      aria-label={`Select ${dim.label} dimension`}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-center text-sm aspect-square flex items-center justify-center"
                    >
                      <div className={`w-6 h-6 bg-gray-600 rounded ${
                        dim.id === '1:1' ? 'aspect-square' :
                        dim.id === '3:4' ? 'aspect-[3/4]' :
                        'aspect-[4/3]'
                      }`}></div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                {Object.entries({
                  promptStrength: 'Prompt strength',
                  steps: 'Steps',
                  guidanceScale: 'Guidance scale'
                }).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-2">
                      <label htmlFor={key} className="text-gray-400">{label}</label>
                      <span className="text-gray-300">
                        {sliderValues[key as keyof typeof sliderValues]}
                      </span>
                    </div>
                    <input
                      id={key}
                      type="range"
                      min={key === 'steps' ? '1' : '0'}
                      max={key === 'steps' ? '50' : '10'}
                      step={key === 'steps' ? '1' : '0.1'}
                      value={sliderValues[key as keyof typeof sliderValues]}
                      onChange={(e) => handleSliderChange(key, e.target.value)}
                      className="slider"
                      aria-label={label}
                    />
                  </div>
                ))}
              </div>

              {/* Seed Input */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Seed</h3>
                <div className="relative">
                  <input
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Random seed for reproducible generation"
                    className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => setSeed(Math.floor(Math.random() * 1000000).toString())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                    aria-label="Generate random seed"
                  >
                    <FiRefreshCw size={16} />
                  </button>
                </div>
              </div>

              {/* Saved LoRAs Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <SavedLoraSection 
                  onSelectLora={handleSelectSavedLora}
                  selectedLoras={selectedLoras}
                />
              </div>
            </div>

            {/* LoRA Scales */}
            {selectedLoras.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Adjust LoRA Scales</h3>
                {selectedLoras.map(lora => (
                  <div key={lora.id} className="space-y-2">
                    <div className="flex justify-between text-sm mb-2">
                      <label htmlFor={`scale-${lora.id}`} className="text-gray-400">{lora.name} Scale</label>
                      <span className="text-gray-300">
                        {loraScales[lora.hfPath] || lora.defaultScale || 0.8}
                      </span>
                    </div>
                    <input
                      id={`scale-${lora.id}`}
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={loraScales[lora.hfPath] || lora.defaultScale || 0.8}
                      onChange={(e) => handleScaleChange(lora.hfPath, parseFloat(e.target.value))}
                      className="slider"
                      aria-label={`${lora.name} Scale`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Prompt Input */}
            <div className="bg-gray-800 rounded-xl p-6">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="w-full h-32 bg-gray-700 rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => setPrompt('')}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Clear prompt"
                  aria-label="Clear prompt"
                >
                  <FiRefreshCw size={20} />
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt || isGenerating}
                  className={`px-6 py-3 rounded-lg flex items-center space-x-2 ${
                    !prompt || isGenerating
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90'
                  } transition-colors`}
                >
                  {isGenerating ? (
                    <>
                      <FiRefreshCw className="animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FiImage />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>
              {error && (
                <div className="mt-4 p-4 bg-red-900/50 text-red-200 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            {/* Generated Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {generatedImages.length > 0 ? (
                generatedImages.map((url, i) => (
                  <div key={i} className="relative group">
                    <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden">
                      <img 
                        src={url} 
                        alt={`Generated image ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                      <button 
                        className="p-2 bg-white bg-opacity-10 rounded-full hover:bg-opacity-20 transition-colors"
                        aria-label="Download image"
                        onClick={() => window.open(url, '_blank')}
                      >
                        <FiDownload size={20} />
                      </button>
                      <button 
                        className="p-2 bg-white bg-opacity-10 rounded-full hover:bg-opacity-20 transition-colors"
                        aria-label="Copy image URL"
                        onClick={() => navigator.clipboard.writeText(url)}
                      >
                        <FiCopy size={20} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                Array.from({ length: numImages }).map((_, i) => (
                  <div key={i} className="relative group">
                    <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden">
                      <div className="w-full h-full bg-gray-700 animate-pulse"></div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Generation History Section */}
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Generation History</h2>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <FiLoader className="animate-spin text-purple-500" size={24} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generationHistory.map((item) => (
                    <div key={item.id} className="bg-gray-800 rounded-xl overflow-hidden">
                      <div className="aspect-square relative group">
                        {item.images[0] && (
                          <img
                            src={item.images[0]}
                            alt={item.prompt}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {/* Overlay with icons */}
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Top-right icons */}
                          <div className="absolute top-4 right-4 flex space-x-3">
                            <button
                              onClick={() => handleDeleteHistory(item.id)}
                              disabled={isDeleting === item.id}
                              className={`p-2.5 rounded-full backdrop-blur-sm transition-colors ${
                                isDeleting === item.id
                                  ? 'bg-red-900/70 cursor-not-allowed'
                                  : 'bg-red-500/70 hover:bg-red-600/90'
                              }`}
                              aria-label="Delete image"
                            >
                              {isDeleting === item.id ? (
                                <FiLoader className="animate-spin" size={18} />
                              ) : (
                                <FiTrash2 size={18} />
                              )}
                            </button>
                            <button
                              onClick={() => setSelectedImage(item.images[0])}
                              className="p-2.5 rounded-full bg-gray-700/70 hover:bg-gray-600/90 backdrop-blur-sm transition-colors"
                              aria-label="View full size"
                            >
                              <FiMaximize2 size={18} />
                            </button>
                            <button
                              onClick={() => {
                                // Set prompt
                                setPrompt(item.prompt);
                                
                                // Set LoRA settings by matching paths
                                const newSelectedLoras = item.settings.loras
                                  .map(({ path }) => {
                                    // Try to find the matching LoRA by comparing paths
                                    const savedLora = availableLoras.find(sl => {
                                      // Compare with different possible path formats
                                      const pathsToCompare = [
                                        path.toLowerCase(),                              // Original path
                                        path.split('/').pop()?.toLowerCase(),           // Just the name
                                        sl.id.toLowerCase(),                            // Saved LoRA id
                                        sl.hfPath.toLowerCase(),                        // Saved LoRA hfPath
                                        `roshmika/${path.split('/').pop()}`.toLowerCase() // Constructed path
                                      ];
                                      
                                      return pathsToCompare.includes(sl.id.toLowerCase()) ||
                                             pathsToCompare.includes(sl.hfPath.toLowerCase());
                                    });
                                    
                                    if (!savedLora) {
                                      console.warn(`Could not find matching LoRA for path: ${path}`);
                                    }
                                    return savedLora || null;
                                  })
                                  .filter((lora): lora is SavedLora => lora !== null);
                                
                                setSelectedLoras(newSelectedLoras);
                                
                                // Set LoRA scales using the exact scales from history
                                const newScales: Record<string, number> = {};
                                item.settings.loras.forEach(({ path, scale }) => {
                                  // Find the matching saved LoRA
                                  const savedLora = availableLoras.find(sl => {
                                    const pathsToCompare = [
                                      path.toLowerCase(),
                                      path.split('/').pop()?.toLowerCase(),
                                      sl.id.toLowerCase(),
                                      sl.hfPath.toLowerCase(),
                                      `roshmika/${path.split('/').pop()}`.toLowerCase()
                                    ];
                                    
                                    return pathsToCompare.includes(sl.id.toLowerCase()) ||
                                           pathsToCompare.includes(sl.hfPath.toLowerCase());
                                  });
                                  
                                  if (savedLora) {
                                    // Store the exact scale from history for this LoRA
                                    newScales[savedLora.hfPath] = scale;
                                  }
                                });
                                
                                setLoraScales(newScales);
                                
                                // Set other generation parameters
                                setNumImages(item.settings.numImages);
                                setSliderValues(prev => ({
                                  ...prev,
                                  guidanceScale: item.settings.guidanceScale,
                                  steps: item.settings.steps
                                }));
                                
                                // Scroll to top of the page
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-2.5 rounded-full bg-purple-500/70 hover:bg-purple-600/90 backdrop-blur-sm transition-colors"
                              aria-label="Apply generation settings"
                            >
                              <FiArrowUp size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-300 line-clamp-2">{item.prompt}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.settings.loras.map(({ path, scale }, index) => (
                            <span key={index} className="text-xs bg-gray-700 px-2 py-1 rounded">
                              {path.split('/')[1]} ({scale})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        imageUrl={selectedImage || ''}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-900">
          <Navigation />
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <ImageGenerator />
                </RequireAuth>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin text-purple-500">
          <FiRefreshCw size={32} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Welcome to Rusher AI</h1>
          <p className="text-gray-400">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default App 