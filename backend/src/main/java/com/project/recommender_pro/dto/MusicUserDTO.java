package com.project.recommender_pro.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MusicUserDTO {
    private String code;
    private String username;
    private String email;
}
