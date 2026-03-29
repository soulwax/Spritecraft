// File: lib/src/models/lpc_models.dart

import 'dart:convert';

import 'metadata_schema.dart';

class LpcLayerDefinition {
  const LpcLayerDefinition({
    required this.id,
    required this.zPos,
    required this.bodyTypePaths,
  });

  final String id;
  final int zPos;
  final Map<String, String> bodyTypePaths;
}

class LpcCreditRecord {
  const LpcCreditRecord({
    required this.file,
    required this.notes,
    required this.authors,
    required this.licenses,
    required this.urls,
  });

  final String file;
  final String notes;
  final List<String> authors;
  final List<String> licenses;
  final List<String> urls;

  factory LpcCreditRecord.fromJson(Map<String, dynamic> json) {
    return LpcCreditRecord(
      file: json['file']?.toString() ?? '',
      notes: json['notes']?.toString() ?? '',
      authors: (json['authors'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic value) => value.toString())
          .toList(),
      licenses: (json['licenses'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic value) => value.toString())
          .toList(),
      urls: (json['urls'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic value) => value.toString())
          .toList(),
    );
  }

  Map<String, Object> toJson() {
    return <String, Object>{
      'file': file,
      'notes': notes,
      'authors': authors,
      'licenses': licenses,
      'urls': urls,
    };
  }
}

class LpcItemDefinition {
  const LpcItemDefinition({
    required this.id,
    required this.name,
    required this.typeName,
    required this.pathSegments,
    required this.priority,
    required this.requiredBodyTypes,
    required this.animations,
    required this.tags,
    required this.variants,
    required this.matchBodyColor,
    required this.layers,
    required this.credits,
  });

  final String id;
  final String name;
  final String typeName;
  final List<String> pathSegments;
  final int? priority;
  final List<String> requiredBodyTypes;
  final List<String> animations;
  final List<String> tags;
  final List<String> variants;
  final bool matchBodyColor;
  final List<LpcLayerDefinition> layers;
  final List<LpcCreditRecord> credits;

  String get category => pathSegments.isEmpty ? typeName : pathSegments.first;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'name': name,
      'typeName': typeName,
      'category': category,
      'path': pathSegments,
      'priority': priority,
      'requiredBodyTypes': requiredBodyTypes,
      'animations': animations,
      'tags': tags,
      'variants': variants,
      'matchBodyColor': matchBodyColor,
    };
  }
}

class LpcCatalog {
  const LpcCatalog({
    required this.itemsById,
    required this.bodyTypes,
    required this.animations,
  });

  final Map<String, LpcItemDefinition> itemsById;
  final List<String> bodyTypes;
  final List<String> animations;

  List<LpcItemDefinition> search({
    String query = '',
    String? bodyType,
    String? animation,
    int limit = 80,
  }) {
    final List<String> tokens = query
        .toLowerCase()
        .split(RegExp(r'\s+'))
        .where((String token) => token.isNotEmpty)
        .toList();

    final List<_ScoredItem> scored =
        itemsById.values
            .where((LpcItemDefinition item) {
              final bool bodyMatches =
                  bodyType == null || item.requiredBodyTypes.contains(bodyType);
              final bool animationMatches =
                  animation == null || item.animations.contains(animation);
              return bodyMatches && animationMatches;
            })
            .map((LpcItemDefinition item) {
              if (tokens.isEmpty) {
                return _ScoredItem(item, 1);
              }

              final String haystack = <String>[
                item.name,
                item.typeName,
                item.category,
                ...item.tags,
                ...item.pathSegments,
              ].join(' ').toLowerCase();

              int score = 0;
              for (final String token in tokens) {
                if (item.name.toLowerCase().contains(token)) {
                  score += 6;
                }
                if (item.tags.any(
                  (String tag) => tag.toLowerCase().contains(token),
                )) {
                  score += 4;
                }
                if (haystack.contains(token)) {
                  score += 2;
                }
              }
              return _ScoredItem(item, score);
            })
            .where((_ScoredItem item) => item.score > 0)
            .toList()
          ..sort((_ScoredItem a, _ScoredItem b) {
            final int scoreCompare = b.score.compareTo(a.score);
            if (scoreCompare != 0) {
              return scoreCompare;
            }
            final int priorityA = a.item.priority ?? 9999;
            final int priorityB = b.item.priority ?? 9999;
            final int priorityCompare = priorityA.compareTo(priorityB);
            if (priorityCompare != 0) {
              return priorityCompare;
            }
            return a.item.name.compareTo(b.item.name);
          });

    return scored.take(limit).map((_ScoredItem item) => item.item).toList();
  }

  Map<String, Object> toSummaryJson() {
    return <String, Object>{
      'itemCount': itemsById.length,
      'bodyTypes': bodyTypes,
      'animations': animations,
    };
  }
}

class LpcRenderRequest {
  const LpcRenderRequest({
    required this.bodyType,
    required this.animation,
    required this.selections,
    this.prompt,
  });

  final String bodyType;
  final String animation;
  final Map<String, String> selections;
  final String? prompt;

  factory LpcRenderRequest.fromJson(Map<String, dynamic> json) {
    return LpcRenderRequest(
      bodyType: json['bodyType']?.toString() ?? 'male',
      animation: json['animation']?.toString() ?? 'idle',
      selections:
          (json['selections'] as Map<String, dynamic>? ?? <String, dynamic>{})
              .map(
                (String key, dynamic value) => MapEntry(key, value.toString()),
              ),
      prompt: json['prompt']?.toString(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'bodyType': bodyType,
      'animation': animation,
      'prompt': prompt,
      'selections': selections,
    };
  }
}

class UsedLpcLayer {
  const UsedLpcLayer({
    required this.itemId,
    required this.itemName,
    required this.typeName,
    required this.variant,
    required this.layerId,
    required this.zPos,
    required this.assetPath,
  });

  final String itemId;
  final String itemName;
  final String typeName;
  final String variant;
  final String layerId;
  final int zPos;
  final String assetPath;

  Map<String, Object> toJson() {
    return <String, Object>{
      'itemId': itemId,
      'itemName': itemName,
      'typeName': typeName,
      'variant': variant,
      'layerId': layerId,
      'zPos': zPos,
      'assetPath': assetPath,
    };
  }
}

class LpcRenderResult {
  const LpcRenderResult({
    required this.pngBytes,
    required this.width,
    required this.height,
    required this.usedLayers,
    required this.credits,
  });

  final List<int> pngBytes;
  final int width;
  final int height;
  final List<UsedLpcLayer> usedLayers;
  final List<LpcCreditRecord> credits;

  Map<String, Object> toApiJson({
    required LpcRenderRequest request,
    String imageName = 'spritecraft-render.png',
  }) {
    return <String, Object>{
      'width': width,
      'height': height,
      'imageBase64': base64Encode(pngBytes),
      'metadata': toMetadataJson(request: request, imageName: imageName),
      'usedLayers': usedLayers
          .map((UsedLpcLayer layer) => layer.toJson())
          .toList(),
      'credits': credits
          .map((LpcCreditRecord credit) => credit.toJson())
          .toList(),
    };
  }

  Map<String, Object> toMetadataJson({
    required LpcRenderRequest request,
    String imageName = 'spritecraft-render.png',
  }) {
    return <String, Object>{
      'schema': <String, Object>{
        'name': kSpriteCraftRenderSchemaName,
        'version': kSpriteCraftRenderSchemaVersion,
      },
      'image': <String, Object>{
        'path': imageName,
        'width': width,
        'height': height,
      },
      'layout': <String, Object>{
        'mode': 'layered-fullsheet',
        'frameCount': 1,
        'columns': 1,
        'rows': 1,
        'tileWidth': width,
        'tileHeight': height,
      },
      'content': <String, Object?>{
        'projectSchemaVersion': kSpriteCraftProjectSchemaVersion,
        'bodyType': request.bodyType,
        'animation': request.animation,
        'prompt': request.prompt,
        'selections': request.selections,
      },
      'layers': usedLayers.map((UsedLpcLayer layer) => layer.toJson()).toList(),
      'credits': credits
          .map((LpcCreditRecord credit) => credit.toJson())
          .toList(),
    };
  }
}

class StudioHistoryEntry {
  const StudioHistoryEntry({
    required this.id,
    required this.createdAt,
    required this.updatedAt,
    required this.bodyType,
    required this.animation,
    required this.prompt,
    required this.selections,
    required this.usedLayers,
    required this.credits,
    this.projectName,
    this.notes,
    this.enginePreset,
    this.tags = const <String>[],
    this.renderSettings = const <String, Object?>{},
    this.exportSettings = const <String, Object?>{},
    this.promptHistory = const <String>[],
    this.exportHistory = const <Map<String, Object?>>[],
  });

  final String id;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String bodyType;
  final String animation;
  final String? prompt;
  final Map<String, String> selections;
  final List<UsedLpcLayer> usedLayers;
  final List<LpcCreditRecord> credits;
  final String? projectName;
  final String? notes;
  final String? enginePreset;
  final List<String> tags;
  final Map<String, Object?> renderSettings;
  final Map<String, Object?> exportSettings;
  final List<String> promptHistory;
  final List<Map<String, Object?>> exportHistory;

  factory StudioHistoryEntry.fromJson(Map<String, dynamic> json) {
    final Map<String, Object?> migrated =
        SpriteCraftSchemaMigrations.migrateProjectRecord(json);

    return StudioHistoryEntry(
      id: migrated['id']?.toString() ?? '',
      createdAt: DateTime.parse(
        migrated['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
      ),
      updatedAt: DateTime.parse(
        migrated['updatedAt']?.toString() ??
            migrated['createdAt']?.toString() ??
            DateTime.now().toIso8601String(),
      ),
      bodyType: migrated['bodyType']?.toString() ?? 'male',
      animation: migrated['animation']?.toString() ?? 'idle',
      prompt: migrated['prompt']?.toString(),
      selections:
          (migrated['selections'] as Map<String, dynamic>? ??
                  <String, dynamic>{})
              .map(
                (String key, dynamic value) => MapEntry(key, value.toString()),
              ),
      usedLayers: (migrated['usedLayers'] as List<dynamic>? ?? <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(
            (Map<String, dynamic> layer) => UsedLpcLayer(
              itemId: layer['itemId']?.toString() ?? '',
              itemName: layer['itemName']?.toString() ?? '',
              typeName: layer['typeName']?.toString() ?? '',
              variant: layer['variant']?.toString() ?? '',
              layerId: layer['layerId']?.toString() ?? '',
              zPos: (layer['zPos'] as num?)?.toInt() ?? 0,
              assetPath: layer['assetPath']?.toString() ?? '',
            ),
          )
          .toList(),
      credits: (migrated['credits'] as List<dynamic>? ?? <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(LpcCreditRecord.fromJson)
          .toList(),
      projectName: migrated['projectName']?.toString(),
      notes: migrated['notes']?.toString(),
      enginePreset: migrated['enginePreset']?.toString(),
      tags: (migrated['tags'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic value) => value.toString())
          .toList(),
      renderSettings: Map<String, Object?>.from(
        migrated['renderSettings'] as Map<String, dynamic>? ??
            <String, dynamic>{},
      ),
      exportSettings: Map<String, Object?>.from(
        migrated['exportSettings'] as Map<String, dynamic>? ??
            <String, dynamic>{},
      ),
      promptHistory: (migrated['promptHistory'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic value) => value.toString())
          .toList(),
      exportHistory:
          (migrated['exportHistory'] as List<dynamic>? ?? <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(
                (Map<String, dynamic> entry) =>
                    Map<String, Object?>.from(entry),
              )
              .toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'schema': <String, Object>{
        'name': kSpriteCraftProjectSchemaName,
        'version': kSpriteCraftProjectSchemaVersion,
      },
      'id': id,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'bodyType': bodyType,
      'animation': animation,
      'prompt': prompt,
      'projectName': projectName,
      'notes': notes,
      'enginePreset': enginePreset,
      'tags': tags,
      'selections': selections,
      'renderSettings': renderSettings,
      'exportSettings': exportSettings,
      'promptHistory': promptHistory,
      'exportHistory': exportHistory,
      'usedLayers': usedLayers
          .map((UsedLpcLayer layer) => layer.toJson())
          .toList(),
      'credits': credits
          .map((LpcCreditRecord credit) => credit.toJson())
          .toList(),
    };
  }
}

class SpriteCraftSchemaMigrations {
  const SpriteCraftSchemaMigrations._();

  static Map<String, Object?> migrateProjectRecord(Map<String, dynamic> input) {
    final Map<String, dynamic> working = Map<String, dynamic>.from(input);
    final DateTime now = DateTime.now().toUtc();
    final List<dynamic> rawPromptHistory =
        working['promptHistory'] as List<dynamic>? ??
        <dynamic>[
          if ((working['prompt']?.toString().trim().isNotEmpty ?? false))
            working['prompt'].toString(),
        ];

    return <String, Object?>{
      'schema': <String, Object>{
        'name': kSpriteCraftProjectSchemaName,
        'version': kSpriteCraftProjectSchemaVersion,
      },
      'id': working['id']?.toString() ?? '',
      'createdAt':
          working['createdAt']?.toString() ?? now.toIso8601String(),
      'updatedAt':
          working['updatedAt']?.toString() ??
          working['createdAt']?.toString() ??
          now.toIso8601String(),
      'bodyType': working['bodyType']?.toString() ?? 'male',
      'animation': working['animation']?.toString() ?? 'idle',
      'prompt': working['prompt']?.toString(),
      'projectName':
          working['projectName']?.toString() ??
          working['name']?.toString() ??
          working['prompt']?.toString(),
      'notes': working['notes']?.toString() ?? '',
      'enginePreset': working['enginePreset']?.toString() ?? 'none',
      'tags': (working['tags'] as List<dynamic>? ?? <dynamic>[]),
      'selections':
          working['selections'] as Map<String, dynamic>? ?? <String, dynamic>{},
      'renderSettings': Map<String, Object?>.from(
        working['renderSettings'] as Map<String, dynamic>? ??
            <String, dynamic>{
              'previewMode': 'single',
              'category': 'all',
              'animationFilter': 'current',
              'tagFilter': 'all',
            },
      ),
      'exportSettings': Map<String, Object?>.from(
        working['exportSettings'] as Map<String, dynamic>? ??
            <String, dynamic>{
              'enginePreset': working['enginePreset']?.toString() ?? 'none',
            },
      ),
      'promptHistory': rawPromptHistory,
      'exportHistory':
          working['exportHistory'] as List<dynamic>? ?? <dynamic>[],
      'usedLayers': working['usedLayers'] as List<dynamic>? ?? <dynamic>[],
      'credits': working['credits'] as List<dynamic>? ?? <dynamic>[],
    };
  }

  static Map<String, Object?> migrateRenderMetadata(Map<String, dynamic> input) {
    final Map<String, dynamic> working = Map<String, dynamic>.from(input);
    final Map<String, dynamic> content =
        working['content'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final Map<String, dynamic> schema =
        working['schema'] as Map<String, dynamic>? ?? <String, dynamic>{};

    return <String, Object?>{
      ...working,
      'schema': <String, Object>{
        'name': schema['name']?.toString() ?? kSpriteCraftRenderSchemaName,
        'version': kSpriteCraftRenderSchemaVersion,
      },
      'content': <String, Object?>{
        'projectSchemaVersion':
            content['projectSchemaVersion'] ?? kSpriteCraftProjectSchemaVersion,
        'bodyType': content['bodyType']?.toString() ?? 'male',
        'animation': content['animation']?.toString() ?? 'idle',
        'prompt': content['prompt']?.toString(),
        'selections':
            content['selections'] as Map<String, dynamic>? ??
            <String, dynamic>{},
      },
      'layers': working['layers'] as List<dynamic>? ?? <dynamic>[],
      'credits': working['credits'] as List<dynamic>? ?? <dynamic>[],
    };
  }
}

class _ScoredItem {
  const _ScoredItem(this.item, this.score);

  final LpcItemDefinition item;
  final int score;
}
