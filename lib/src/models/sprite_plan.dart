// File: lib/src/models/sprite_plan.dart

class SpritePlan {
  const SpritePlan({
    required this.concept,
    required this.frameCount,
    required this.frameWidth,
    required this.frameHeight,
    required this.styleTags,
    required this.framePrompts,
    required this.buildPath,
  });

  final String concept;
  final int frameCount;
  final int frameWidth;
  final int frameHeight;
  final List<String> styleTags;
  final List<String> framePrompts;
  final List<SpriteBuildPathStep> buildPath;

  factory SpritePlan.fromJson(Map<String, dynamic> json) {
    return SpritePlan(
      concept: json['concept'] as String? ?? 'Untitled sprite plan',
      frameCount: json['frameCount'] as int? ?? 1,
      frameWidth: json['frameWidth'] as int? ?? 64,
      frameHeight: json['frameHeight'] as int? ?? 64,
      styleTags: (json['styleTags'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic value) => value.toString())
          .toList(),
      framePrompts: (json['framePrompts'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic value) => value.toString())
          .toList(),
      buildPath: (json['buildPath'] as List<dynamic>? ?? <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(SpriteBuildPathStep.fromJson)
          .toList(),
    );
  }

  Map<String, Object> toJson() {
    return <String, Object>{
      'concept': concept,
      'frameCount': frameCount,
      'frameWidth': frameWidth,
      'frameHeight': frameHeight,
      'styleTags': styleTags,
      'framePrompts': framePrompts,
      'buildPath': buildPath
          .map((SpriteBuildPathStep step) => step.toJson())
          .toList(),
    };
  }
}

class SpriteBuildPathStep {
  const SpriteBuildPathStep({
    required this.slot,
    required this.label,
    required this.query,
    required this.rationale,
  });

  final String slot;
  final String label;
  final String query;
  final String rationale;

  factory SpriteBuildPathStep.fromJson(Map<String, dynamic> json) {
    return SpriteBuildPathStep(
      slot: json['slot']?.toString() ?? 'build-step',
      label: json['label']?.toString() ?? 'Build step',
      query: json['query']?.toString() ?? '',
      rationale: json['rationale']?.toString() ?? '',
    );
  }

  Map<String, Object> toJson() {
    return <String, Object>{
      'slot': slot,
      'label': label,
      'query': query,
      'rationale': rationale,
    };
  }
}
