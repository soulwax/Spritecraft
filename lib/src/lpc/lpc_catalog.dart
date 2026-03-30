// File: lib/src/lpc/lpc_catalog.dart

import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as path;

import '../models/lpc_models.dart';

class LpcCatalogLoader {
  const LpcCatalogLoader();

  Future<LpcCatalog> load(Directory definitionsDirectory) async {
    if (!await definitionsDirectory.exists()) {
      return const LpcCatalog(
        itemsById: <String, LpcItemDefinition>{},
        bodyTypes: <String>[],
        animations: <String>[],
      );
    }

    final Map<String, LpcItemDefinition> items = <String, LpcItemDefinition>{};
    final Set<String> bodyTypes = <String>{};
    final Set<String> animations = <String>{};
    final List<String> loadWarnings = <String>[];

    await for (final FileSystemEntity entity in definitionsDirectory.list(
      recursive: true,
    )) {
      if (entity is! File ||
          path.extension(entity.path).toLowerCase() != '.json') {
        continue;
      }

      final String relativePath = path.relative(
        entity.path,
        from: definitionsDirectory.path,
      );
      final Map<String, dynamic> json;
      try {
        final Object? decoded = jsonDecode(await entity.readAsString());
        if (decoded is! Map) {
          loadWarnings.add(
            'Skipping $relativePath because the definition root is not a JSON object.',
          );
          continue;
        }
        json = decoded.map(
          (dynamic key, dynamic value) => MapEntry(key.toString(), value),
        );
      } on FormatException catch (error) {
        loadWarnings.add(
          'Skipping $relativePath because it is not valid JSON: ${error.message}',
        );
        continue;
      }

      if (!json.containsKey('layer_1') || !json.containsKey('type_name')) {
        loadWarnings.add(
          'Skipping $relativePath because it is missing required LPC keys like type_name or layer_1.',
        );
        continue;
      }

      final String id = path.basenameWithoutExtension(entity.path);
      final List<String> relativeSegments = path
          .relative(entity.path, from: definitionsDirectory.path)
          .split(path.separator);
      if (relativeSegments.isNotEmpty) {
        relativeSegments.removeLast();
      }
      relativeSegments.add(id);

      final List<LpcLayerDefinition> layers = <LpcLayerDefinition>[];
      for (int index = 1; index < 10; index++) {
        final Object? rawLayer = json['layer_$index'];
        if (rawLayer == null) {
          break;
        }
        if (rawLayer is! Map) {
          loadWarnings.add(
            'Skipping layer_$index in $relativePath because the layer payload is not an object.',
          );
          continue;
        }
        final Map<String, dynamic> layer = rawLayer.map(
          (dynamic key, dynamic value) => MapEntry(key.toString(), value),
        );

        final Map<String, String> bodyPaths = <String, String>{};
        for (final MapEntry<String, dynamic> entry in layer.entries) {
          if (entry.key == 'zPos') {
            continue;
          }
          if (entry.value is String &&
              entry.value.toString().trim().isNotEmpty) {
            bodyPaths[entry.key] = entry.value.toString();
            bodyTypes.add(entry.key);
          }
        }
        if (bodyPaths.isEmpty) {
          loadWarnings.add(
            'Skipping layer_$index in $relativePath because it does not define any usable body-type asset paths.',
          );
          continue;
        }

        layers.add(
          LpcLayerDefinition(
            id: 'layer_$index',
            zPos: (layer['zPos'] as num?)?.toInt() ?? 0,
            bodyTypePaths: bodyPaths,
          ),
        );
      }

      final List<String> itemAnimations =
          (json['animations'] as List<dynamic>? ?? <dynamic>[])
              .map((dynamic value) => value.toString())
              .toList();
      animations.addAll(itemAnimations);
      if (layers.isEmpty) {
        loadWarnings.add(
          'Skipping $relativePath because none of its layers defined usable asset paths.',
        );
        continue;
      }

      items[id] = LpcItemDefinition(
        id: id,
        name: json['name']?.toString() ?? id,
        typeName: json['type_name']?.toString() ?? relativeSegments.first,
        pathSegments: relativeSegments,
        priority: (json['priority'] as num?)?.toInt(),
        requiredBodyTypes:
            layers
                .expand((LpcLayerDefinition layer) => layer.bodyTypePaths.keys)
                .toSet()
                .toList()
              ..sort(),
        animations: itemAnimations,
        tags: (json['tags'] as List<dynamic>? ?? <dynamic>[])
            .map((dynamic value) => value.toString())
            .toList(),
        variants: (json['variants'] as List<dynamic>? ?? <dynamic>[])
            .map((dynamic value) => value.toString())
            .toList(),
        matchBodyColor: json['match_body_color'] == true,
        layers: layers,
        credits: (json['credits'] as List<dynamic>? ?? <dynamic>[])
            .whereType<Map>()
            .map(
              (Map<dynamic, dynamic> credit) => LpcCreditRecord.fromJson(
                credit.map(
                  (dynamic key, dynamic value) =>
                      MapEntry(key.toString(), value),
                ),
              ),
            )
            .toList(),
      );
    }

    final List<String> sortedBodyTypes = bodyTypes.toList()..sort();
    final List<String> sortedAnimations = animations.toList()..sort();

    return LpcCatalog(
      itemsById: items,
      bodyTypes: sortedBodyTypes,
      animations: sortedAnimations,
      loadWarnings: loadWarnings,
    );
  }
}
