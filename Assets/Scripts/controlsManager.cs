using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class controlsManager : MonoBehaviour
{
    public bool cardSelected;
    public schachbrett brett;
    public Camera cam;
    public schachfeld selectedfield;
    public GameObject myPrefab;
    public GameObject myEnemiePrefab;
    // Start is called before the first frame update
    void Start()
    {
        cardSelected = false;
    }

    // Update is called once per frame
    void Update()
    {
        //wenn karte ausgewählt ist soll geprüft werden über welches feld man mit der maus fährt
        if(cardSelected)
        {
            RaycastHit hit;
            int layer_mask = LayerMask.GetMask("Field");
            Ray ray = cam.ScreenPointToRay(Input.mousePosition);
            if (Physics.Raycast(ray, out hit, 1000, layer_mask))
            {
                if(hit.collider.tag == "chessfield")
                {
                    if (hit.collider.GetComponent<schachfeld>().Equals(selectedfield))
                    {

                    }
                    else
                    {
                        if(selectedfield != null)
                        {
                            selectedfield.selected = false;
                        }
                        
                        selectedfield = hit.collider.GetComponent<schachfeld>();
                        selectedfield.selected = true;
                    }

                }
                else
                {
                    if(selectedfield != null)
                    {
                        selectedfield.selected = false;
                    }                    
                    selectedfield = null;
                }
                
            }
          
        }
        
    }
}
