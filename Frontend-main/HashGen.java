import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class HashGen {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println("Admin@123: " + encoder.encode("Admin@123"));
        System.out.println("Dealer@123: " + encoder.encode("Dealer@123"));
        System.out.println("Customer@123: " + encoder.encode("Customer@123"));
    }
}
