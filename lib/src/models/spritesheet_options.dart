// File: lib/src/models/spritesheet_options.dart

class SpritesheetOptions {
  const SpritesheetOptions({
    required this.inputDirectory,
    required this.outputImagePath,
    required this.outputMetadataPath,
    this.columns,
    this.padding = 0,
    this.forcePowerOfTwo = false,
    this.tileWidth,
    this.tileHeight,
    this.animationName = 'default',
    this.frameDurationMs = 100,
    this.pivotX,
    this.pivotY,
  });

  final String inputDirectory;
  final String outputImagePath;
  final String outputMetadataPath;
  final int? columns;
  final int padding;
  final bool forcePowerOfTwo;
  final int? tileWidth;
  final int? tileHeight;
  final String animationName;
  final int frameDurationMs;
  final int? pivotX;
  final int? pivotY;
}
