class SpriteNameOption {
  const SpriteNameOption({
    required this.value,
    required this.rationale,
  });

  final String value;
  final String rationale;

  factory SpriteNameOption.fromJson(Map<String, dynamic> json) {
    return SpriteNameOption(
      value: json['value']?.toString() ?? '',
      rationale: json['rationale']?.toString() ?? '',
    );
  }

  Map<String, Object> toJson() {
    return <String, Object>{
      'value': value,
      'rationale': rationale,
    };
  }
}

class SpriteNamingSuggestions {
  const SpriteNamingSuggestions({
    required this.projectNames,
    required this.animationLabels,
    required this.exportStems,
    required this.summary,
  });

  final List<SpriteNameOption> projectNames;
  final List<SpriteNameOption> animationLabels;
  final List<SpriteNameOption> exportStems;
  final String summary;

  factory SpriteNamingSuggestions.fromJson(Map<String, dynamic> json) {
    return SpriteNamingSuggestions(
      projectNames:
          (json['projectNames'] as List<dynamic>? ?? <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(SpriteNameOption.fromJson)
              .toList(),
      animationLabels:
          (json['animationLabels'] as List<dynamic>? ?? <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(SpriteNameOption.fromJson)
              .toList(),
      exportStems:
          (json['exportStems'] as List<dynamic>? ?? <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(SpriteNameOption.fromJson)
              .toList(),
      summary: json['summary']?.toString() ?? '',
    );
  }

  Map<String, Object> toJson() {
    return <String, Object>{
      'projectNames': projectNames
          .map((SpriteNameOption option) => option.toJson())
          .toList(),
      'animationLabels': animationLabels
          .map((SpriteNameOption option) => option.toJson())
          .toList(),
      'exportStems': exportStems
          .map((SpriteNameOption option) => option.toJson())
          .toList(),
      'summary': summary,
    };
  }
}
