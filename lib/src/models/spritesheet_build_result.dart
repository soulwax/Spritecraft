// File: lib/src/models/spritesheet_build_result.dart

import 'metadata_schema.dart';

class SpriteFramePlacement {
  const SpriteFramePlacement({
    required this.name,
    required this.sourcePath,
    required this.index,
    required this.column,
    required this.row,
    required this.tileX,
    required this.tileY,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.tileWidth,
    required this.tileHeight,
    required this.offsetX,
    required this.offsetY,
    required this.sourceWidth,
    required this.sourceHeight,
    required this.durationMs,
    required this.pivotX,
    required this.pivotY,
    required this.tags,
  });

  final String name;
  final String sourcePath;
  final int index;
  final int column;
  final int row;
  final int tileX;
  final int tileY;
  final int x;
  final int y;
  final int width;
  final int height;
  final int tileWidth;
  final int tileHeight;
  final int offsetX;
  final int offsetY;
  final int sourceWidth;
  final int sourceHeight;
  final int durationMs;
  final int pivotX;
  final int pivotY;
  final List<String> tags;

  Map<String, Object> toJson() {
    return <String, Object>{
      'name': name,
      'sourcePath': sourcePath,
      'index': index,
      'column': column,
      'row': row,
      'tileX': tileX,
      'tileY': tileY,
      'x': x,
      'y': y,
      'width': width,
      'height': height,
      'tileWidth': tileWidth,
      'tileHeight': tileHeight,
      'offsetX': offsetX,
      'offsetY': offsetY,
      'sourceWidth': sourceWidth,
      'sourceHeight': sourceHeight,
      'durationMs': durationMs,
      'pivotX': pivotX,
      'pivotY': pivotY,
      'tags': tags,
    };
  }
}

class SpritesheetAnimationSequence {
  const SpritesheetAnimationSequence({
    required this.name,
    required this.loop,
    required this.frameIndices,
    required this.totalDurationMs,
  });

  final String name;
  final bool loop;
  final List<int> frameIndices;
  final int totalDurationMs;

  Map<String, Object> toJson() {
    return <String, Object>{
      'name': name,
      'loop': loop,
      'frameIndices': frameIndices,
      'totalDurationMs': totalDurationMs,
    };
  }
}

class SpritesheetBuildResult {
  const SpritesheetBuildResult({
    required this.sheetWidth,
    required this.sheetHeight,
    required this.tileWidth,
    required this.tileHeight,
    required this.columns,
    required this.rows,
    required this.imagePath,
    required this.metadataPath,
    required this.frames,
    required this.animations,
  });

  final int sheetWidth;
  final int sheetHeight;
  final int tileWidth;
  final int tileHeight;
  final int columns;
  final int rows;
  final String imagePath;
  final String metadataPath;
  final List<SpriteFramePlacement> frames;
  final List<SpritesheetAnimationSequence> animations;

  Map<String, Object> toJson() {
    return <String, Object>{
      'schema': <String, Object>{
        'name': kSpriteCraftSpritesheetSchemaName,
        'version': kSpriteCraftSpritesheetSchemaVersion,
      },
      'image': <String, Object>{
        'path': imagePath,
        'width': sheetWidth,
        'height': sheetHeight,
      },
      'layout': <String, Object>{
        'mode': 'uniform-grid',
        'tileWidth': tileWidth,
        'tileHeight': tileHeight,
        'columns': columns,
        'rows': rows,
        'frameCount': frames.length,
      },
      'metadataPath': metadataPath,
      'animations': animations
          .map((SpritesheetAnimationSequence animation) => animation.toJson())
          .toList(),
      'frames': frames
          .map((SpriteFramePlacement frame) => frame.toJson())
          .toList(),
    };
  }
}
