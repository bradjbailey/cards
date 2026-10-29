const cardModules = import.meta.glob('./src/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function normalizeAssetName(fileName: string) {
  return fileName.replace(/\.png$/, '').replace(/[^a-zA-Z0-9]+/g, '_')
}

export const playingCardAssets = Object.fromEntries(
  Object.entries(cardModules).map(([path, src]) => {
    const fileName = path.split('/').pop() ?? path
    return [normalizeAssetName(fileName), src]
  }),
)

export default playingCardAssets
