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

    await for (final FileSystemEntity entity in definitionsDirectory.list(
      recursive: true,
    )) {
      if (entity is! File ||
          path.extension(entity.path).toLowerCase() != '.json') {
        continue;
      }

      final Map<String, dynamic> json =
          jsonDecode(await entity.readAsString()) as Map<String, dynamic>;

      if (!json.containsKey('layer_1') || !json.containsKey('type_name')) {
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
        final Map<String, dynamic>? layer =
            json['layer_$index'] as Map<String, dynamic>?;
        if (layer == null) {
          break;
        }

        final Map<String, String> bodyPaths = <String, String>{};
        for (final MapEntry<String, dynamic> entry in layer.entries) {
          if (entry.key == 'zPos') {
            continue;
          }
          if (entry.value != null) {
            bodyPaths[entry.key] = entry.value.toString();
            bodyTypes.add(entry.key);
          }
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
            .whereType<Map<String, dynamic>>()
            .map(LpcCreditRecord.fromJson)
            .toList(),
      );
    }

    final List<String> sortedBodyTypes = bodyTypes.toList()..sort();
    final List<String> sortedAnimations = animations.toList()..sort();

    return LpcCatalog(
      itemsById: items,
      bodyTypes: sortedBodyTypes,
      animations: sortedAnimations,
    );
  }
}
