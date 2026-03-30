import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/lpc_models.dart';
import '../models/sprite_style_helper.dart';

class SpriteStyleHelper {
  SpriteStyleHelper({
    this.apiKey,
    http.Client? client,
    this.model = 'gemini-2.5-flash',
  }) : _client = client ?? http.Client();

  final String? apiKey;
  final String model;
  final http.Client _client;

  Future<SpriteStyleHelperResult> build({
    required String prompt,
    required String animation,
    required List<String> promptHistory,
    required List<String> tags,
    required String notes,
    required List<LpcItemDefinition> stagedItems,
  }) async {
    final SpriteStyleHelperResult fallback = buildFallback(
      prompt: prompt,
      animation: animation,
      promptHistory: promptHistory,
      tags: tags,
      notes: notes,
      stagedItems: stagedItems,
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
      final String stagedSummary = stagedItems
          .take(8)
          .map((LpcItemDefinition item) => '${item.name} (${item.typeName})')
          .join(', ');
      final String instructions =
          '''
You help creators refine the style direction of an LPC-style character build.
Return JSON only with this shape:
{
  "summary": "string",
  "paletteDirections": [
    {
      "label": "string",
      "swatches": ["string", "string", "string"],
      "rationale": "string"
    }
  ],
  "styleTags": ["string", "string"],
  "guidance": ["string", "string"],
  "focusQueries": ["string", "string"]
}
Rules:
- paletteDirections: 2-3 practical directions with color names, not hex codes.
- styleTags: short reusable style cues suitable for project tags.
- guidance: concise build guidance that helps choose layers now.
- focusQueries: search phrases that help find matching layers in the catalog.
- Keep the advice grounded in modular fantasy sprite composition.
Prompt: $prompt
Animation: $animation
Prompt history: ${promptHistory.join(' | ')}
Tags: ${tags.join(', ')}
Notes: $notes
Staged items: $stagedSummary
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

  SpriteStyleHelperResult buildFallback({
    required String prompt,
    required String animation,
    required List<String> promptHistory,
    required List<String> tags,
    required String notes,
    required List<LpcItemDefinition> stagedItems,
  }) {
    final List<String> cues = _deriveCues(
      prompt: prompt,
      promptHistory: promptHistory,
      tags: tags,
      notes: notes,
      stagedItems: stagedItems,
    );
    final String primary = cues.isNotEmpty ? cues.first : 'grounded';
    final String secondary = cues.length > 1 ? cues[1] : 'adventurer';
    final String tertiary = cues.length > 2 ? cues[2] : animation;

    final List<SpritePaletteDirection> paletteDirections =
        <SpritePaletteDirection>[
          SpritePaletteDirection(
            label: 'Muted ${_titleCase(primary)}',
            swatches: const <String>['sage', 'oak brown', 'bone'],
            rationale:
                'Keeps the build readable and practical while matching a restrained LPC-style silhouette.',
          ),
          SpritePaletteDirection(
            label: 'Weathered ${_titleCase(secondary)}',
            swatches: const <String>['charcoal', 'rust red', 'dusty tan'],
            rationale:
                'Adds stronger accent contrast without making the build feel too ornamental.',
          ),
          SpritePaletteDirection(
            label: '${_titleCase(tertiary)} Accent',
            swatches: const <String>['deep teal', 'soft gold', 'smoke grey'],
            rationale:
                'Useful when the current build needs one stronger identifying color cue.',
          ),
        ];

    final List<String> styleTags = <String>{
      ...tags.map((String entry) => entry.trim()).where((String entry) => entry.isNotEmpty),
      primary,
      secondary,
      if (stagedItems.any((LpcItemDefinition item) => item.matchBodyColor))
        'body-color-aware',
      if (animation.trim().isNotEmpty) '$animation-ready',
    }.take(6).toList(growable: false);

    final List<String> guidance = <String>[
      'Keep one dominant material family so the current layer stack reads as one outfit instead of isolated parts.',
      if (stagedItems.any((LpcItemDefinition item) => item.matchBodyColor))
        'Use body-color-aware pieces sparingly and let one accent accessory carry the strongest hue.',
      'Favor repeatable accents across headwear, torso, and gear so the export feels consistent in motion.',
    ];

    final List<String> focusQueries = <String>[
      '$primary $secondary ${animation.trim()}',
      '$primary leather cloth accessory',
      '${stagedItems.isNotEmpty ? stagedItems.first.typeName : 'accent'} $secondary trim',
    ];

    return SpriteStyleHelperResult(
      summary:
          'These style helpers keep the current build consistent by turning saved prompt memory and staged layer cues into palette direction and focused catalog searches.',
      paletteDirections: paletteDirections,
      styleTags: styleTags,
      guidance: guidance,
      focusQueries: focusQueries,
    );
  }

  SpriteStyleHelperResult _parseResponse(
    Map<String, dynamic> payload, {
    required SpriteStyleHelperResult fallback,
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

    final SpriteStyleHelperResult parsed = SpriteStyleHelperResult.fromJson(
      jsonDecode(_extractJson(text)) as Map<String, dynamic>,
    );
    return SpriteStyleHelperResult(
      summary: parsed.summary.trim().isEmpty ? fallback.summary : parsed.summary,
      paletteDirections: parsed.paletteDirections.isEmpty
          ? fallback.paletteDirections
          : parsed.paletteDirections.take(3).toList(growable: false),
      styleTags: parsed.styleTags.isEmpty
          ? fallback.styleTags
          : parsed.styleTags.take(6).toList(growable: false),
      guidance: parsed.guidance.isEmpty
          ? fallback.guidance
          : parsed.guidance.take(4).toList(growable: false),
      focusQueries: parsed.focusQueries.isEmpty
          ? fallback.focusQueries
          : parsed.focusQueries.take(4).toList(growable: false),
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

  List<String> _deriveCues({
    required String prompt,
    required List<String> promptHistory,
    required List<String> tags,
    required String notes,
    required List<LpcItemDefinition> stagedItems,
  }) {
    final Map<String, int> counts = <String, int>{};

    for (final String tag in tags) {
      final String normalized = tag.trim().toLowerCase();
      if (normalized.isEmpty) {
        continue;
      }
      counts[normalized] = (counts[normalized] ?? 0) + 4;
    }

    for (final LpcItemDefinition item in stagedItems) {
      counts[item.typeName.toLowerCase()] = (counts[item.typeName.toLowerCase()] ?? 0) + 2;
      for (final String tag in item.tags.take(3)) {
        final String normalized = tag.trim().toLowerCase();
        if (normalized.isEmpty) {
          continue;
        }
        counts[normalized] = (counts[normalized] ?? 0) + 2;
      }
    }

    for (final String text in <String>[prompt, ...promptHistory.take(3), notes]) {
      for (final String token in RegExp(r"[A-Za-z][A-Za-z'-]{2,}")
          .allMatches(text.toLowerCase())
          .map((RegExpMatch match) => match.group(0) ?? '')) {
        if (_styleStopWords.contains(token)) {
          continue;
        }
        counts[token] = (counts[token] ?? 0) + 1;
      }
    }

    final List<MapEntry<String, int>> ranked = counts.entries.toList()
      ..sort((MapEntry<String, int> left, MapEntry<String, int> right) {
        final int scoreCompare = right.value.compareTo(left.value);
        return scoreCompare != 0 ? scoreCompare : left.key.compareTo(right.key);
      });

    return ranked.map((MapEntry<String, int> entry) => entry.key).take(6).toList();
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

const Set<String> _styleStopWords = <String>{
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
  'layer',
  'layers',
};
