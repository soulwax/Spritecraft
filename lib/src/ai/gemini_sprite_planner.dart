import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/sprite_plan.dart';

class GeminiSpritePlanner {
  GeminiSpritePlanner({
    required this.apiKey,
    http.Client? client,
    this.model = 'gemini-2.5-flash',
  }) : _client = client ?? http.Client();

  final String apiKey;
  final String model;
  final http.Client _client;

  Future<SpritePlan> suggestPlan({
    required String prompt,
    int? frameCountHint,
    String? styleHint,
  }) async {
    final Uri uri = Uri.https(
      'generativelanguage.googleapis.com',
      '/v1beta/models/$model:generateContent',
      <String, String>{'key': apiKey},
    );

    final String instructions =
        '''
You are helping plan a game-ready spritesheet.
Return JSON only with this shape:
{
  "concept": "string",
  "frameCount": 8,
  "frameWidth": 64,
  "frameHeight": 64,
  "styleTags": ["pixel art", "top down"],
  "framePrompts": ["frame 1 prompt", "frame 2 prompt"]
}
The plan should be practical for spritesheet generation.
Frame prompts should describe adjacent animation frames consistently.
${frameCountHint == null ? '' : 'Target roughly $frameCountHint frames.'}
${styleHint == null ? '' : 'Preferred style: $styleHint.'}
User request: $prompt
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
      throw StateError(
        'Gemini request failed (${response.statusCode}): ${response.body}',
      );
    }

    final Map<String, dynamic> payload =
        jsonDecode(response.body) as Map<String, dynamic>;
    return parsePlanResponse(payload);
  }

  SpritePlan parsePlanResponse(Map<String, dynamic> payload) {
    final List<dynamic> candidates =
        payload['candidates'] as List<dynamic>? ?? <dynamic>[];
    if (candidates.isEmpty) {
      throw StateError('Gemini returned no candidates.');
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
      throw StateError('Gemini candidate did not contain text.');
    }

    final String normalized = _extractJson(text);
    final Map<String, dynamic> decoded =
        jsonDecode(normalized) as Map<String, dynamic>;
    return SpritePlan.fromJson(decoded);
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
}
