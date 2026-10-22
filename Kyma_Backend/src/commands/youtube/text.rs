pub(super) fn normalize(text: &str) -> String {
    let mut s = text.to_lowercase();

    let patterns = [
        " (official video)",
        " (official music video)",
        " (official audio)",
        " (official lyric video)",
        " (official lyrics)",
        " (official)",
        " (audio)",
        " (lyrics)",
        " (lyric video)",
        " (visualizer)",
        " (music video)",
        " (video)",
        " (hd)",
        " (hq)",
        " (4k)",
        " (explicit)",
        " (clean)",
        " (radio edit)",
        " [official video]",
        " [official audio]",
        " [official]",
        " [lyrics]",
        " [audio]",
        " [hd]",
        " [hq]",
    ];

    for pattern in patterns {
        if let Some(pos) = s.find(pattern) {
            s = s[..pos].trim().to_string();
        }
    }

    s = s.replace('&', "and");
    s = s.replace('|', " ");
    s = s
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == ' ' {
                c
            } else {
                ' '
            }
        })
        .collect();
    s = s.split_whitespace().collect::<Vec<_>>().join(" ");
    s
}

pub(super) fn phonetic_key(s: &str) -> String {
    let s = normalize(s);
    let mut key = String::new();
    let mut prev = ' ';
    for c in s.chars() {
        let code = match c {
            'a' | 'e' | 'i' | 'o' | 'u' => '0',
            'b' | 'f' | 'p' | 'v' => '1',
            'c' | 'g' | 'j' | 'k' | 'q' | 's' | 'x' | 'z' => '2',
            'd' | 't' => '3',
            'l' => '4',
            'm' | 'n' => '5',
            'r' => '6',
            ' ' => ' ',
            _ => continue,
        };
        if code != prev {
            key.push(code);
            prev = code;
        }
    }
    key
}

pub(super) fn token_overlap(a: &str, b: &str) -> f32 {
    let set_a: std::collections::HashSet<&str> = a.split_whitespace().collect();
    let set_b: std::collections::HashSet<&str> = b.split_whitespace().collect();
    if set_a.is_empty() && set_b.is_empty() {
        return 1.0;
    }
    let intersection = set_a.intersection(&set_b).count() as f32;
    let union = set_a.union(&set_b).count() as f32;
    intersection / union
}
