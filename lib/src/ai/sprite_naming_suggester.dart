import 'dart:convert';

import 'package:http/http.dart' as http;

import '../server/export_support.dart';
import '../models/sprite_name_suggestions.dart';

class SpriteNamingSuggester {
  SpriteNamingSuggester({
    this.apiKey,
    http.Client? client,
    this.model = 'gemini-2.5-flash',
  }) : _client = client ?? http.Client();

  final String? apiKey;
  final String model;
  final http.Client _client;

  Future<SpriteNamingSuggestions> suggestNames({
    required String prompt,
    required String animation,
    required List<String> promptHistory,
    required List<String> tags,
    required String notes,
    required int selectionCount,
  }) async {
    final SpriteNamingSuggestions fallback = buildFallbackSuggestions(
      prompt: prompt,
      animation: animation,
      promptHistory: promptHistory,
      tags: tags,
      notes: notes,
      selectionCount: selectionCount,
    );

    final String? key = apiKey?.trim();
    if (key == null || key.isEmpty) {
      return fallback;
    }

    try {
      final Uri uri = Uri.https(
        'generativelanguage.googleapis.com',
        '/v1beta/models/$model:generateContent',
        <String, String>{'key': key},
      );
      final String instructions =
          '''
You help name LPC-style character builder projects.
Return JSON only in this shape:
{
  "summary": "string",
  "projectNames": [{"value": "string", "rationale": "string"}],
  "animationLabels": [{"value": "string", "rationale": "string"}],
  "exportStems": [{"value": "string", "rationale": "string"}]
}
Rules:
- projectNames: 3 concise, creator-friendly saved-project names in Title Case.
- animationLabels: 3 concise labels suited to frame naming or animation display.
- exportStems: 3 filesystem-friendly stems, lowercase words only.
- Keep names practical for an LPC character creator, not lore-heavy.
- Favor consistency with prior direction when prompt history or tags imply a style.
Prompt: $prompt
Animation: $animation
Prompt history: ${promptHistory.join(' | ')}
Tags: ${tags.join(', ')}
Notes: $notes
Selection count: $selectionCount
Fallback summary for tone reference: ${fallback.summary}
''';

      final http.Response response = await _client.post(
        uri,
        headers: <String, String>{'Content-Type': 'application/json'},
        body: jsonEncode(<String, Object>{
          'contents': <Object>[
            <String, Object>{
              'parts': <Object>[
                <String, String>{'text': instructions},
              ],
            },
          ],
        }),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return fallback;
      }

      final Map<String, dynamic> payload =
          jsonDecode(response.body) as Map<String, dynamic>;
      return _parseResponse(payload, fallback: fallback);
    } on Exception {
      return fallback;
    }
  }

  SpriteNamingSuggestions buildFallbackSuggestions({
    required String prompt,
    required String animation,
    required List<String> promptHistory,
    required List<String> tags,
    required String notes,
    required int selectionCount,
  }) {
    final List<String> keywords = _deriveKeywords(
      prompt: prompt,
      promptHistory: promptHistory,
      tags: tags,
      notes: notes,
    );
    final String primary = keywords.isNotEmpty ? keywords.first : 'Sprite';
    final String secondary = keywords.length > 1 ? keywords[1] : animation;
    final String tertiary = keywords.length > 2 ? keywords[2] : 'Build';
    final String animationLabel = _titleCase(animation);

    final List<SpriteNameOption> projectNames = <SpriteNameOption>[
      SpriteNameOption(
        value: '${_titleCase(primary)} ${_titleCase(secondary)}',
        rationale: 'Leans on the strongest saved direction cues for a clear project label.',
      ),
      SpriteNameOption(
        value: '${_titleCase(primary)} $animationLabel Build',
        rationale: 'Keeps the current animation mode visible in the project name.',
      ),
      SpriteNameOption(
        value: '${_titleCase(primary)} ${_titleCase(tertiary)} Kit',
        rationale: 'Works well for iterative LPC character exploration.',
      ),
    ];

    final List<SpriteNameOption> animationLabels = <SpriteNameOption>[
      SpriteNameOption(
        value: '${_titleCase(primary)} $animationLabel',
        rationale: 'Connects the current animation to the strongest motif in the brief.',
      ),
      SpriteNameOption(
        value: '$animationLabel Loop',
        rationale: 'Simple and engine-friendly for exported animation strips.',
      ),
      SpriteNameOption(
        value: '${_titleCase(primary)} $animationLabel Cycle',
        rationale: 'Good fit for frame prefixes and editor labels.',
      ),
    ];

    final List<SpriteNameOption> exportStems = <SpriteNameOption>[
      SpriteNameOption(
        value: ExportSupport.sanitizeFileStem(
          '$primary-$secondary-$animation',
          namingStyle: 'kebab',
        ),
        rationale: 'Short stem that stays close to the current brief and animation.',
      ),
      SpriteNameOption(
        value: ExportSupport.sanitizeFileStem(
          '$primary-character-$animation',
          namingStyle: 'kebab',
        ),
        rationale: 'Safe default for repeated export iterations.',
      ),
      SpriteNameOption(
        value: ExportSupport.sanitizeFileStem(
          '$primary-$selectionCount-layer-build',
          namingStyle: 'kebab',
        ),
        rationale: 'Highlights the current build complexity in the exported bundle name.',
      ),
    ];

    return SpriteNamingSuggestions(
      projectNames: _dedupeOptions(projectNames),
      animationLabels: _dedupeOptions(animationLabels),
      exportStems: _dedupeOptions(exportStems),
      summary:
          'Naming suggestions are keeping the current brief aligned with saved prompt memory and the active animation context.',
    );
  }

  SpriteNamingSuggestions _parseResponse(
    Map<String, dynamic> payload, {
    required SpriteNamingSuggestions fallback,
  }) {
    final List<dynamic> candidates =
        payload['candidates'] as List<dynamic>? ?? <dynamic>[];
    if (candidates.isEmpty) {
      return fallback;
    }

    final Map<String, dynamic> firstCandidate =
        candidates.first as Map<String, dynamic>;
    final Map<String, dynamic> content =
        firstCandidate['content'] as Map<String, dynamic>? ??
        <String, dynamic>{};
    final List<dynamic> parts =
        content['parts'] as List<dynamic>? ?? <dynamic>[];
    final String text = parts
        .map((dynamic part) => (part as Map<String, dynamic>)['text'])
        .whereType<String>()
        .join('\n')
        .trim();

    if (text.isEmpty) {
      return fallback;
    }

    final Map<String, dynamic> decoded =
        jsonDecode(_extractJson(text)) as Map<String, dynamic>;
    final SpriteNamingSuggestions parsed = SpriteNamingSuggestions.fromJson(
      decoded,
    );

    return SpriteNamingSuggestions(
      summary: parsed.summary.trim().isEmpty ? fallback.summary : parsed.summary,
      projectNames: parsed.projectNames.isEmpty
          ? fallback.projectNames
          : _dedupeOptions(parsed.projectNames),
      animationLabels: parsed.animationLabels.isEmpty
          ? fallback.animationLabels
          : _dedupeOptions(parsed.animationLabels),
      exportStems: parsed.exportStems.isEmpty
          ? fallback.exportStems
          : _dedupeOptions(
              parsed.exportStems
                  .map(
                    (SpriteNameOption option) => SpriteNameOption(
                      value: ExportSupport.sanitizeFileStem(
                        option.value,
                        namingStyle: 'kebab',
                      ),
                      rationale: option.rationale,
                    ),
                  )
                  .toList(),
            ),
    );
  }

  String _extractJson(String text) {
    final String withoutFence = text
        .replaceFirst(RegExp(r'^```json\s*'), '')
        .replaceFirst(RegExp(r'^```\s*'), '')
        .replaceFirst(RegExp(r'\s*```$'), '')
        .trim();

    final int start = withoutFence.indexOf('{');
    final int end = withoutFence.lastIndexOf('}');
    if (start == -1 || end == -1 || end <= start) {
      throw StateError('Gemini response did not contain JSON.');
    }

    return withoutFence.substring(start, end + 1);
  }

  List<String> _deriveKeywords({
    required String prompt,
    required List<String> promptHistory,
    required List<String> tags,
    required String notes,
  }) {
    final Map<String, int> counts = <String, int>{};
    for (final String tag in tags) {
      final String normalized = tag.trim().toLowerCase();
      if (normalized.isEmpty) {
        continue;
      }
      counts[normalized] = (counts[normalized] ?? 0) + 4;
    }

    for (final String source in <String>[prompt, ...promptHistory.take(3), notes]) {
      for (final String token in RegExp(r"[A-Za-z][A-Za-z'-]{2,}")
          .allMatches(source.toLowerCase())
          .map((RegExpMatch match) => match.group(0) ?? '')) {
        if (_stopWords.contains(token)) {
          continue;
        }
        counts[token] = (counts[token] ?? 0) + 1;
      }
    }

    final List<MapEntry<String, int>> ranked = counts.entries.toList()
      ..sort((MapEntry<String, int> a, MapEntry<String, int> b) {
        final int score = b.value.compareTo(a.value);
        return score != 0 ? score : a.key.compareTo(b.key);
      });

    return ranked.map((MapEntry<String, int> entry) => entry.key).take(5).toList();
  }

  List<SpriteNameOption> _dedupeOptions(List<SpriteNameOption> options) {
    final Map<String, SpriteNameOption> deduped = <String, SpriteNameOption>{};
    for (final SpriteNameOption option in options) {
      final String normalized = option.value.trim();
      if (normalized.isEmpty) {
        continue;
      }
      deduped.putIfAbsent(
        normalized.toLowerCase(),
        () => SpriteNameOption(value: normalized, rationale: option.rationale),
      );
    }
    return deduped.values.take(3).toList(growable: false);
  }

  String _titleCase(String value) {
    return value
        .split(RegExp(r'[^A-Za-z0-9]+'))
        .where((String token) => token.isNotEmpty)
        .map((String token) {
          final String lower = token.toLowerCase();
          return '${lower[0].toUpperCase()}${lower.substring(1)}';
        })
        .join(' ');
  }
}

const Set<String> _stopWords = <String>{
  'with',
  'that',
  'this',
  'from',
  'into',
  'idle',
  'walk',
  'attack',
  'ready',
  'character',
  'sprite',
  'create',
  'look',
  'make',
  'have',
  'uses',
  'using',
  'keep',
  'very',
  'more',
  'less',
  'than',
  'then',
  'they',
  'their',
  'them',
  'neutral',
  'simple',
  'current',
  'saved',
  'project',
  'workspace',
};
