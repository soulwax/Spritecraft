import 'package:spritecraft/src/models/lpc_models.dart';
import 'package:test/test.dart';

void main() {
  group('StudioHistoryEntry', () {
    test('toJson includes project schema metadata and richer project fields', () {
      final StudioHistoryEntry entry = StudioHistoryEntry(
        id: 'project-1',
        createdAt: DateTime.utc(2026, 3, 28, 20, 0, 0),
        updatedAt: DateTime.utc(2026, 3, 28, 21, 30, 0),
        bodyType: 'male',
        animation: 'idle',
        prompt: 'Town ranger',
        selections: const <String, String>{'hood_green': 'default'},
        usedLayers: const <UsedLpcLayer>[
          UsedLpcLayer(
            itemId: 'hood_green',
            itemName: 'Green Hood',
            typeName: 'Head',
            variant: 'default',
            layerId: 'hood',
            zPos: 2,
            assetPath: 'spritesheets/hood_green.png',
          ),
        ],
        credits: const <LpcCreditRecord>[
          LpcCreditRecord(
            file: 'spritesheets/hood_green.png',
            notes: '',
            authors: <String>['Artist'],
            licenses: <String>['CC-BY-SA'],
            urls: <String>['https://example.test'],
          ),
        ],
        projectName: 'Ranger Draft',
        notes: 'Focus on forest colors.',
        enginePreset: 'godot',
        tags: const <String>['ranger', 'forest'],
        renderSettings: const <String, Object?>{'previewMode': 'compare'},
        exportSettings: const <String, Object?>{'enginePreset': 'godot'},
        promptHistory: const <String>['Town ranger'],
        exportHistory: const <Map<String, Object?>>[
          <String, Object?>{
            'exportedAt': '2026-03-28T21:35:00.000Z',
            'bundlePath': 'build/exports/ranger.zip',
          },
        ],
      );

      final Map<String, Object?> json = entry.toJson();

      expect(json['schema'], <String, Object>{
        'name': 'spritecraft.project',
        'version': kSpriteCraftProjectSchemaVersion,
      });
      expect(json['projectName'], 'Ranger Draft');
      expect(json['notes'], 'Focus on forest colors.');
      expect(json['tags'], <String>['ranger', 'forest']);
      expect(
        json['exportHistory'],
        <Map<String, Object?>>[
          <String, Object?>{
            'exportedAt': '2026-03-28T21:35:00.000Z',
            'bundlePath': 'build/exports/ranger.zip',
          },
        ],
      );
    });

    test('fromJson keeps explicit modern project fields intact', () {
      final StudioHistoryEntry entry = StudioHistoryEntry.fromJson(
        <String, dynamic>{
          'schema': <String, Object>{
            'name': 'spritecraft.project',
            'version': kSpriteCraftProjectSchemaVersion,
          },
          'id': 'project-2',
          'createdAt': '2026-03-28T10:00:00.000Z',
          'updatedAt': '2026-03-28T11:00:00.000Z',
          'bodyType': 'female',
          'animation': 'walk',
          'prompt': 'Traveling mage',
          'projectName': 'Mage Build',
          'notes': 'Keep silhouette slim.',
          'enginePreset': 'unity',
          'tags': <String>['mage', 'travel'],
          'selections': <String, String>{'robe_blue': 'default'},
          'renderSettings': <String, Object?>{'previewMode': 'compare'},
          'exportSettings': <String, Object?>{'enginePreset': 'unity'},
          'promptHistory': <String>['Traveling mage'],
          'exportHistory': <Map<String, Object?>>[
            <String, Object?>{'bundlePath': 'build/exports/mage.zip'},
          ],
        },
      );

      expect(entry.projectName, 'Mage Build');
      expect(entry.notes, 'Keep silhouette slim.');
      expect(entry.enginePreset, 'unity');
      expect(entry.tags, <String>['mage', 'travel']);
      expect(entry.renderSettings['previewMode'], 'compare');
      expect(entry.exportHistory.single['bundlePath'], 'build/exports/mage.zip');
    });
  });
}
