package com.project.recommender_pro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.web.client.RestTemplate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import com.project.recommender_pro.config.ClerkConfig;

@EnableJpaRepositories(basePackages = "com.project.recommender_pro.repository")
@EntityScan("com.project.recommender_pro.model")
@SpringBootApplication // Removed explicit @ComponentScan
public class RecommenderProApplication {
	public static void main(String[] args) {
		SpringApplication.run(RecommenderProApplication.class, args);
	}

	@Bean
	public RestTemplate restTemplate() {
		return new RestTemplate();
	}


	@Component
	public class StartupRunner implements CommandLineRunner {

		private final ClerkConfig clerkConfig;

		public StartupRunner(ClerkConfig clerkConfig) {
			this.clerkConfig = clerkConfig;
		}

		@Override
		public void run(String... args) {
			System.out.println("CLERK_API_KEY=" + clerkConfig.getClerkApiKey());
			System.out.println("WEBHOOK_ID=" + clerkConfig.getWebhookId());
		}
	}

}